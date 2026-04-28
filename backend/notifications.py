"""Listorix push notifications module.

Responsibilities:
 - Read device tokens from Supabase using the service role key (bypassing RLS).
 - Read user notification preferences (mute, per-event toggles, quiet hours).
 - Resolve target audience (group members minus sender, or explicit list).
 - Send batched messages to Expo Push API (https://exp.host/--/api/v2/push/send).

This module is wired into FastAPI in server.py.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from typing import Any, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("notifications")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

EventType = Literal[
    "item_added",
    "item_checked",
    "member_joined",
    "invite_received",
    "suggestion_reminder",
]

EVENT_TO_PREF_KEY: dict[str, str] = {
    "item_added": "item_added",
    "item_checked": "item_checked",
    "member_joined": "member_joined",
    "invite_received": "invite_received",
    "suggestion_reminder": "suggestion_reminders",
}


class SendNotificationRequest(BaseModel):
    event: EventType
    title: str
    body: str
    # Either provide group_id (auto-resolves to all other members) or target_user_ids
    group_id: Optional[str] = None
    target_user_ids: Optional[list[str]] = None
    # Excluded user — usually the sender. They never get their own pushes.
    exclude_user_id: Optional[str] = None
    data: dict[str, Any] = Field(default_factory=dict)


class SendNotificationResponse(BaseModel):
    ok: bool
    sent: int
    skipped_muted: int
    skipped_quiet: int
    skipped_no_token: int
    skipped_pref_off: int
    error: Optional[str] = None


router = APIRouter(prefix="/notifications", tags=["notifications"])


# --------------- Supabase helpers (service role) -------------------------

async def _sb_request(
    client: httpx.AsyncClient,
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json: Any = None,
) -> Any:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(
            500,
            detail="Supabase service credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env",
        )
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    r = await client.request(method, url, params=params, json=json, headers=headers, timeout=20)
    if r.status_code >= 400:
        logger.warning("Supabase %s %s -> %s: %s", method, path, r.status_code, r.text[:300])
        r.raise_for_status()
    if r.status_code == 204 or not r.content:
        return None
    return r.json()


async def _verify_user_jwt(jwt: str) -> str:
    """Verify Supabase JWT by calling /auth/v1/user. Returns user_id or raises."""
    if not SUPABASE_URL:
        raise HTTPException(500, detail="SUPABASE_URL not set")
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {jwt}",
                "apikey": SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY,
            },
            timeout=10,
        )
        if r.status_code != 200:
            raise HTTPException(401, detail="Invalid auth token")
        return r.json()["id"]


async def _resolve_target_user_ids(
    client: httpx.AsyncClient,
    *,
    group_id: Optional[str],
    target_user_ids: Optional[list[str]],
    exclude_user_id: Optional[str],
) -> list[str]:
    if target_user_ids:
        ids = list({u for u in target_user_ids if u and u != exclude_user_id})
        return ids
    if not group_id:
        return []
    rows = await _sb_request(
        client,
        "GET",
        "group_members",
        params={"group_id": f"eq.{group_id}", "select": "user_id"},
    ) or []
    ids = [r["user_id"] for r in rows if r.get("user_id") and r["user_id"] != exclude_user_id]
    return list(set(ids))


async def _fetch_prefs_and_tokens(
    client: httpx.AsyncClient, user_ids: list[str]
) -> tuple[dict[str, dict[str, Any]], dict[str, list[str]]]:
    if not user_ids:
        return {}, {}
    in_clause = "in.(" + ",".join(user_ids) + ")"
    prefs_rows = await _sb_request(
        client,
        "GET",
        "notification_preferences",
        params={"user_id": in_clause, "select": "*"},
    ) or []
    tokens_rows = await _sb_request(
        client,
        "GET",
        "device_tokens",
        params={"user_id": in_clause, "select": "user_id,expo_push_token"},
    ) or []
    prefs = {r["user_id"]: r for r in prefs_rows}
    tokens: dict[str, list[str]] = {}
    for r in tokens_rows:
        tokens.setdefault(r["user_id"], []).append(r["expo_push_token"])
    return prefs, tokens


def _is_in_quiet_hours(prefs: dict[str, Any], now_hour: int) -> bool:
    if not prefs.get("quiet_enabled"):
        return False
    qs = int(prefs.get("quiet_start", 22))
    qe = int(prefs.get("quiet_end", 8))
    if qs == qe:
        return False
    if qs < qe:
        return qs <= now_hour < qe
    # wraps midnight
    return now_hour >= qs or now_hour < qe


async def _post_to_expo(messages: list[dict[str, Any]]) -> tuple[int, Optional[str]]:
    if not messages:
        return 0, None
    sent = 0
    last_err: Optional[str] = None
    async with httpx.AsyncClient(timeout=20) as client:
        # Expo accepts up to 100 messages per request
        for i in range(0, len(messages), 100):
            batch = messages[i : i + 100]
            try:
                r = await client.post(
                    EXPO_PUSH_URL,
                    json=batch,
                    headers={
                        "Accept": "application/json",
                        "Accept-encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                )
                if r.status_code == 200:
                    sent += len(batch)
                else:
                    last_err = f"Expo {r.status_code}: {r.text[:200]}"
                    logger.warning("Expo push failed: %s", last_err)
            except Exception as e:  # noqa: BLE001
                last_err = str(e)
                logger.warning("Expo push exception: %s", e)
    return sent, last_err


# --------------- Routes ---------------------------------------------------

async def _get_caller_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, detail="Missing bearer token")
    jwt = authorization.split(" ", 1)[1].strip()
    return await _verify_user_jwt(jwt)


@router.post("/send", response_model=SendNotificationResponse)
async def send_notification(
    payload: SendNotificationRequest,
    caller_id: str = Depends(_get_caller_user_id),
) -> SendNotificationResponse:
    """Send a push notification to other group members or explicit users.

    Filters out: muted users, users with this event type disabled, users in quiet hours,
    and users with no registered tokens.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return SendNotificationResponse(
            ok=False, sent=0, skipped_muted=0, skipped_quiet=0,
            skipped_no_token=0, skipped_pref_off=0,
            error="backend_not_configured",
        )
    exclude = payload.exclude_user_id or caller_id

    async with httpx.AsyncClient() as client:
        target_ids = await _resolve_target_user_ids(
            client,
            group_id=payload.group_id,
            target_user_ids=payload.target_user_ids,
            exclude_user_id=exclude,
        )
        if not target_ids:
            return SendNotificationResponse(
                ok=True, sent=0, skipped_muted=0, skipped_quiet=0,
                skipped_no_token=0, skipped_pref_off=0,
            )
        prefs, tokens = await _fetch_prefs_and_tokens(client, target_ids)

    now_hour = datetime.now(timezone.utc).hour  # NOTE: server tz; future enhancement: per-user tz
    pref_key = EVENT_TO_PREF_KEY[payload.event]

    messages: list[dict[str, Any]] = []
    skipped_muted = skipped_pref_off = skipped_quiet = skipped_no_token = 0

    for uid in target_ids:
        p = prefs.get(uid, {})
        if p.get("muted"):
            skipped_muted += 1
            continue
        if p and not p.get(pref_key, True):
            skipped_pref_off += 1
            continue
        if p and _is_in_quiet_hours(p, now_hour):
            skipped_quiet += 1
            continue
        user_tokens = tokens.get(uid, [])
        if not user_tokens:
            skipped_no_token += 1
            continue
        for tk in user_tokens:
            messages.append(
                {
                    "to": tk,
                    "title": payload.title,
                    "body": payload.body,
                    "data": {**payload.data, "event": payload.event},
                    "sound": "default",
                    "priority": "high",
                    "channelId": "default",
                }
            )

    sent, err = await _post_to_expo(messages)
    return SendNotificationResponse(
        ok=err is None,
        sent=sent,
        skipped_muted=skipped_muted,
        skipped_quiet=skipped_quiet,
        skipped_no_token=skipped_no_token,
        skipped_pref_off=skipped_pref_off,
        error=err,
    )


@router.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY),
        "supabase_url_set": bool(SUPABASE_URL),
        "service_key_set": bool(SUPABASE_SERVICE_KEY),
    }
