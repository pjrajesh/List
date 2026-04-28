"""Shared Supabase helpers for the FastAPI backend.

Centralizes:
 - JWT verification dependency (`get_caller_user_id`)
 - PostgREST request helper using the service-role key (`sb_request`)

This is used by notifications.py and ai.py.
"""
from __future__ import annotations

import os
from typing import Any, Optional

import httpx
from fastapi import Header, HTTPException

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")


async def verify_user_jwt(jwt: str) -> str:
    """Verify a Supabase user JWT by hitting /auth/v1/user. Returns user_id."""
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


async def get_caller_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, detail="Missing bearer token")
    jwt = authorization.split(" ", 1)[1].strip()
    return await verify_user_jwt(jwt)


async def sb_request(
    client: httpx.AsyncClient,
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json: Any = None,
    extra_headers: dict[str, str] | None = None,
) -> Any:
    """Send a PostgREST request using the service-role key (bypasses RLS)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(
            500,
            detail="Supabase service credentials not configured. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env",
        )
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    r = await client.request(method, url, params=params, json=json, headers=headers, timeout=20)
    if r.status_code >= 400:
        r.raise_for_status()
    if r.status_code == 204 or not r.content:
        return None
    return r.json()
