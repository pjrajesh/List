"""Listorix — AI features: voice transcription + receipt/screenshot scanning.

Endpoints:
 - GET  /api/ai/usage?day_local=YYYY-MM-DD     → today's quota usage for caller
 - POST /api/ai/voice/transcribe (multipart)    → Whisper-grade transcribe + parse to items
 - POST /api/ai/scan/receipt (multipart)        → GPT-4o vision parse of bills/screenshots

Key features:
 - Daily quotas (per LOCAL day): 20 voice, 10 scan
 - Voice rejected as song/non-shopping does NOT count toward the quota
 - Image is server-side compressed (Pillow) before sending to OpenAI vision (cost saver)
 - Structured outputs via OpenAI's json_schema (strict=true)
"""
from __future__ import annotations

import base64
import io
import logging
import os
from datetime import date, datetime
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from openai import AsyncOpenAI
from PIL import Image
from pydantic import BaseModel

from supabase_admin import get_caller_user_id, sb_request

logger = logging.getLogger("ai")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
client: Optional[AsyncOpenAI] = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

DAILY_VOICE_LIMIT = 20
DAILY_SCAN_LIMIT = 10
MAX_AUDIO_BYTES = 5 * 1024 * 1024   # 5 MB, plenty for 30s
MAX_IMAGE_BYTES = 12 * 1024 * 1024  # 12 MB pre-compress

router = APIRouter(prefix="/ai", tags=["ai"])

# --------------------------- Helpers ------------------------------------

def _today_local(day_local: Optional[str]) -> str:
    """Validate and return a YYYY-MM-DD string. Falls back to UTC date if invalid."""
    if day_local:
        try:
            datetime.strptime(day_local, "%Y-%m-%d")
            return day_local
        except ValueError:
            pass
    return date.today().isoformat()


async def _get_quota_row(http: httpx.AsyncClient, user_id: str, day_local: str) -> dict[str, Any]:
    rows = await sb_request(
        http,
        "GET",
        "usage_quotas",
        params={
            "user_id": f"eq.{user_id}",
            "day_local": f"eq.{day_local}",
            "select": "*",
        },
    ) or []
    if rows:
        return rows[0]
    # Lazy create
    new = {"user_id": user_id, "day_local": day_local, "voice_count": 0, "scan_count": 0}
    try:
        await sb_request(
            http, "POST", "usage_quotas", json=new,
            extra_headers={"Prefer": "resolution=ignore-duplicates,return=minimal"},
        )
    except Exception:  # noqa: BLE001
        pass
    return new


async def _inc_quota(http: httpx.AsyncClient, user_id: str, day_local: str, *, voice: int = 0, scan: int = 0) -> dict[str, int]:
    row = await _get_quota_row(http, user_id, day_local)
    new_voice = int(row.get("voice_count", 0)) + voice
    new_scan = int(row.get("scan_count", 0)) + scan
    try:
        await sb_request(
            http,
            "POST",
            "usage_quotas",
            params={"on_conflict": "user_id,day_local"},
            json={
                "user_id": user_id,
                "day_local": day_local,
                "voice_count": new_voice,
                "scan_count": new_scan,
                "updated_at": datetime.utcnow().isoformat() + "Z",
            },
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("inc_quota failed: %s", e)
    return {"voice_count": new_voice, "scan_count": new_scan}


# --------------------------- Schemas (response_format) ------------------

VOICE_PARSE_SCHEMA: dict[str, Any] = {
    "name": "voice_parse",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "is_shopping_intent": {"type": "boolean"},
            "rejection_reason": {
                "type": "string",
                "description": "Empty if is_shopping_intent=true. Otherwise one of: song, music, gibberish, unrelated, silence",
            },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": "string"},
                        "quantity": {"type": "number"},
                        "unit": {"type": "string", "description": "Unit like kg, g, L, ml, pcs, packets, dozen. Empty if none."},
                        "category": {
                            "type": "string",
                            "enum": [
                                "Vegetables", "Fruits", "Dairy", "Grains",
                                "Snacks", "Beverages", "Household", "Personal Care", "Other",
                            ],
                        },
                        "emoji": {"type": "string"},
                    },
                    "required": ["name", "quantity", "unit", "category", "emoji"],
                },
            },
        },
        "required": ["is_shopping_intent", "rejection_reason", "items"],
    },
}

SCAN_SCHEMA: dict[str, Any] = {
    "name": "scan_parse",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "source": {
                "type": "string",
                "enum": ["zepto", "swiggy", "blinkit", "instamart", "bigbasket", "receipt", "list", "unknown"],
            },
            "currency": {"type": "string", "description": "ISO code if visible (INR, USD), else empty string."},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": "string"},
                        "quantity": {"type": "number"},
                        "unit": {"type": "string"},
                        "price": {"type": "number"},
                        "category": {
                            "type": "string",
                            "enum": [
                                "Vegetables", "Fruits", "Dairy", "Grains",
                                "Snacks", "Beverages", "Household", "Personal Care", "Other",
                            ],
                        },
                        "emoji": {"type": "string"},
                    },
                    "required": ["name", "quantity", "unit", "price", "category", "emoji"],
                },
            },
        },
        "required": ["source", "currency", "items"],
    },
}


# --------------------------- Routes -------------------------------------

class UsageResponse(BaseModel):
    day_local: str
    voice_count: int
    voice_limit: int
    voice_remaining: int
    scan_count: int
    scan_limit: int
    scan_remaining: int


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    day_local: Optional[str] = None,
    caller_id: str = Depends(get_caller_user_id),
):
    day = _today_local(day_local)
    async with httpx.AsyncClient() as http:
        row = await _get_quota_row(http, caller_id, day)
    vc = int(row.get("voice_count", 0))
    sc = int(row.get("scan_count", 0))
    return UsageResponse(
        day_local=day,
        voice_count=vc,
        voice_limit=DAILY_VOICE_LIMIT,
        voice_remaining=max(DAILY_VOICE_LIMIT - vc, 0),
        scan_count=sc,
        scan_limit=DAILY_SCAN_LIMIT,
        scan_remaining=max(DAILY_SCAN_LIMIT - sc, 0),
    )


@router.get("/health")
async def ai_health() -> dict[str, Any]:
    return {
        "ok": True,
        "openai_configured": bool(OPENAI_API_KEY and client),
        "voice_limit": DAILY_VOICE_LIMIT,
        "scan_limit": DAILY_SCAN_LIMIT,
    }


# ---- VOICE ----

VOICE_SYSTEM_PROMPT = """You convert spontaneous spoken shopping requests into structured grocery items.

Strict rules:
1) First decide: is_shopping_intent. True ONLY if the user is naming items to buy.
   Set FALSE for songs/lyrics/poetry/music, gibberish, silence, or any unrelated talk
   (news, conversation, jokes, instructions). When false, set rejection_reason
   to one of: song, music, gibberish, unrelated, silence. Return items=[].

2) When TRUE, extract distinct items. Examples:
     "do kg pyaaz aur ek litre doodh"  -> [{name:"Onion", quantity:2, unit:"kg", ...}, {name:"Milk", quantity:1, unit:"L", ...}]
     "milk bread and 6 eggs"            -> 3 items.
     "add some apples"                  -> 1 item, quantity:1 unit:""

3) Normalize: use English item names in singular form ("onion" not "onions" or "pyaaz").
   Translate Hindi/Tamil/Telugu/Bengali words to common English.

4) Pick a fitting emoji and the closest category from the allowed enum.

5) Quantity must be a positive number. If not stated, use 1. unit can be "" (empty).
"""


@router.post("/voice/transcribe")
async def voice_transcribe(
    audio: UploadFile = File(...),
    day_local: str = Form(""),
    caller_id: str = Depends(get_caller_user_id),
):
    if not client:
        raise HTTPException(503, detail="OPENAI_API_KEY not configured on server")
    day = _today_local(day_local or None)

    async with httpx.AsyncClient() as http:
        row = await _get_quota_row(http, caller_id, day)
        if int(row.get("voice_count", 0)) >= DAILY_VOICE_LIMIT:
            raise HTTPException(
                429,
                detail={
                    "error": "voice_quota_exceeded",
                    "message": f"You've used all {DAILY_VOICE_LIMIT} voice attempts for today. Try again tomorrow.",
                    "voice_count": int(row.get("voice_count", 0)),
                    "voice_limit": DAILY_VOICE_LIMIT,
                },
            )

    raw = await audio.read()
    if not raw or len(raw) > MAX_AUDIO_BYTES:
        raise HTTPException(400, detail="audio missing or too large (max 5 MB)")

    # 1) Transcribe with gpt-4o-transcribe
    try:
        # Wrap bytes for the SDK
        bio = io.BytesIO(raw)
        bio.name = audio.filename or "speech.m4a"
        tr = await client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=bio,
        )
        transcript = (tr.text or "").strip()
    except Exception as e:  # noqa: BLE001
        logger.exception("transcription failed")
        raise HTTPException(502, detail=f"Transcription failed: {e}") from e

    if not transcript:
        # Empty / silent audio — don't burn quota
        return {
            "ok": False,
            "is_shopping_intent": False,
            "rejection_reason": "silence",
            "transcript": "",
            "items": [],
            "usage": {"voice_count": int(row.get("voice_count", 0)), "voice_limit": DAILY_VOICE_LIMIT},
        }

    # 2) Classify + parse
    try:
        comp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": VOICE_SYSTEM_PROMPT},
                {"role": "user", "content": f"Transcript: {transcript}"},
            ],
            response_format={"type": "json_schema", "json_schema": VOICE_PARSE_SCHEMA},
            temperature=0,
        )
        import json as _json
        parsed = _json.loads(comp.choices[0].message.content or "{}")
    except Exception as e:  # noqa: BLE001
        logger.exception("voice parse failed")
        raise HTTPException(502, detail=f"Voice parsing failed: {e}") from e

    is_shop = bool(parsed.get("is_shopping_intent"))
    items = parsed.get("items", []) if is_shop else []

    usage = {"voice_count": int(row.get("voice_count", 0)), "voice_limit": DAILY_VOICE_LIMIT}
    if is_shop and items:
        async with httpx.AsyncClient() as http:
            updated = await _inc_quota(http, caller_id, day, voice=1)
        usage = {"voice_count": updated["voice_count"], "voice_limit": DAILY_VOICE_LIMIT}

    return {
        "ok": is_shop and bool(items),
        "is_shopping_intent": is_shop,
        "rejection_reason": parsed.get("rejection_reason", ""),
        "transcript": transcript,
        "items": items,
        "usage": usage,
    }


# ---- SCAN ----

SCAN_SYSTEM_PROMPT = """You read shopping bills and grocery-app screenshots (Zepto, Swiggy Instamart, Blinkit, BigBasket, Dunzo, paper receipts, or photos of handwritten lists).

Extract every distinct line item the user actually purchased or listed. For each item return:
 - name (clean English, e.g., "Tomato" not "TOM RED FRESH 1KG")
 - quantity (number; default 1 if not visible)
 - unit (kg, g, L, ml, pcs, dozen, packets, bottles; "" if unclear)
 - price (the displayed line item price as a number; 0 if not visible)
 - a fitting category and emoji

Detect the source from logos / layout (zepto / swiggy / blinkit / instamart / bigbasket / receipt / list / unknown).
Detect currency (e.g., INR, USD) if visible, else "".

Skip non-item lines (subtotals, taxes, delivery fee, totals, coupons, promotions, packing charges, GST). Skip header/footer text.

If the image isn't a bill or shopping list, return empty items array and source="unknown".
"""


@router.post("/scan/receipt")
async def scan_receipt(
    image: UploadFile = File(...),
    day_local: str = Form(""),
    caller_id: str = Depends(get_caller_user_id),
):
    if not client:
        raise HTTPException(503, detail="OPENAI_API_KEY not configured on server")
    day = _today_local(day_local or None)

    async with httpx.AsyncClient() as http:
        row = await _get_quota_row(http, caller_id, day)
        if int(row.get("scan_count", 0)) >= DAILY_SCAN_LIMIT:
            raise HTTPException(
                429,
                detail={
                    "error": "scan_quota_exceeded",
                    "message": f"You've used all {DAILY_SCAN_LIMIT} scans for today. Try again tomorrow.",
                    "scan_count": int(row.get("scan_count", 0)),
                    "scan_limit": DAILY_SCAN_LIMIT,
                },
            )

    raw = await image.read()
    if not raw:
        raise HTTPException(400, detail="image missing")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(400, detail=f"image too large (max {MAX_IMAGE_BYTES // (1024*1024)} MB)")

    # Server-side compression — cap at 1600px long edge, JPEG q=82
    try:
        img = Image.open(io.BytesIO(raw))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        max_dim = 1600
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim))
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=82, optimize=True)
        out.seek(0)
        compressed = out.read()
    except Exception:  # noqa: BLE001
        compressed = raw  # fall back to original

    b64 = base64.b64encode(compressed).decode("ascii")
    data_url = f"data:image/jpeg;base64,{b64}"

    try:
        comp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SCAN_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Parse this image into structured items."},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
            response_format={"type": "json_schema", "json_schema": SCAN_SCHEMA},
            temperature=0,
            max_tokens=2000,
        )
        import json as _json
        parsed = _json.loads(comp.choices[0].message.content or "{}")
    except Exception as e:  # noqa: BLE001
        logger.exception("scan failed")
        raise HTTPException(502, detail=f"Scan failed: {e}") from e

    items = parsed.get("items", [])
    usage = {"scan_count": int(row.get("scan_count", 0)), "scan_limit": DAILY_SCAN_LIMIT}
    if items:
        async with httpx.AsyncClient() as http:
            updated = await _inc_quota(http, caller_id, day, scan=1)
        usage = {"scan_count": updated["scan_count"], "scan_limit": DAILY_SCAN_LIMIT}

    return {
        "ok": bool(items),
        "source": parsed.get("source", "unknown"),
        "currency": parsed.get("currency", ""),
        "items": items,
        "usage": usage,
    }
