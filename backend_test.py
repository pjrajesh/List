"""Listorix Backend — Deployment Readiness Health Check
Tests:
 1. Health probes (3 endpoints)
 2. AI usage tracking auth gate
 3. AI Voice/Scan auth gates
 4. Notifications auth + validation gates
 5. Static / 404 routing

Targets the public preview URL from frontend/.env (EXPO_PUBLIC_BACKEND_URL).
"""
from __future__ import annotations

import json
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import httpx

# Locate backend URL from frontend/.env
FRONTEND_ENV = Path("/app/frontend/.env")
BACKEND_URL = None
if FRONTEND_ENV.exists():
    for line in FRONTEND_ENV.read_text().splitlines():
        line = line.strip()
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BACKEND_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

if not BACKEND_URL:
    print("FATAL: EXPO_PUBLIC_BACKEND_URL not found in /app/frontend/.env")
    sys.exit(1)

API = f"{BACKEND_URL.rstrip('/')}/api"

# Supabase config for optional signup to mint a real JWT
SUPABASE_URL = "https://vdvrkzeproulsrbguhgt.supabase.co"
SUPABASE_ANON = "sb_publishable_lZ0cJid7KN-z7yzhikxKPQ_LRfSwTlA"


results: list[tuple[str, str, str]] = []  # (endpoint, status, detail)


def record(endpoint: str, ok: bool, detail: str) -> None:
    status = "PASS" if ok else "FAIL"
    results.append((endpoint, status, detail))
    print(f"[{status}] {endpoint} :: {detail}")


def test_top_health() -> None:
    try:
        r = httpx.get(f"{API}/health", timeout=15)
        if r.status_code != 200:
            record("GET /api/health", False, f"status={r.status_code} body={r.text[:200]}")
            return
        j = r.json()
        ok = (
            j.get("ok") is True
            and j.get("service") == "listorix-backend"
            and j.get("openai_configured") is True
            and j.get("supabase_configured") is True
            and j.get("mongo_configured") is True
        )
        record("GET /api/health", ok, f"body={j}")
    except Exception as e:
        record("GET /api/health", False, f"exception={e}")


def test_ai_health() -> None:
    try:
        r = httpx.get(f"{API}/ai/health", timeout=15)
        if r.status_code != 200:
            record("GET /api/ai/health", False, f"status={r.status_code} body={r.text[:200]}")
            return
        j = r.json()
        ok = (
            j.get("ok") is True
            and j.get("openai_configured") is True
            and j.get("voice_limit") == 20
            and j.get("scan_limit") == 10
        )
        record("GET /api/ai/health", ok, f"body={j}")
    except Exception as e:
        record("GET /api/ai/health", False, f"exception={e}")


def test_notif_health() -> None:
    try:
        r = httpx.get(f"{API}/notifications/health", timeout=15)
        if r.status_code != 200:
            record("GET /api/notifications/health", False, f"status={r.status_code} body={r.text[:200]}")
            return
        j = r.json()
        ok = (
            j.get("ok") is True
            and j.get("supabase_configured") is True
            and j.get("supabase_url_set") is True
            and j.get("service_key_set") is True
        )
        record("GET /api/notifications/health", ok, f"body={j}")
    except Exception as e:
        record("GET /api/notifications/health", False, f"exception={e}")


def test_ai_usage_no_auth() -> None:
    try:
        r = httpx.get(f"{API}/ai/usage", timeout=15)
        ok = r.status_code == 401
        record("GET /api/ai/usage (no auth)", ok, f"status={r.status_code}")
    except Exception as e:
        record("GET /api/ai/usage (no auth)", False, f"exception={e}")


def test_voice_no_auth() -> None:
    try:
        # No body needed, auth dep should reject first
        r = httpx.post(f"{API}/ai/voice/transcribe", timeout=15)
        ok = r.status_code == 401
        record("POST /api/ai/voice/transcribe (no auth)", ok, f"status={r.status_code}")
    except Exception as e:
        record("POST /api/ai/voice/transcribe (no auth)", False, f"exception={e}")


def test_scan_no_auth() -> None:
    try:
        r = httpx.post(f"{API}/ai/scan/receipt", timeout=15)
        ok = r.status_code == 401
        record("POST /api/ai/scan/receipt (no auth)", ok, f"status={r.status_code}")
    except Exception as e:
        record("POST /api/ai/scan/receipt (no auth)", False, f"exception={e}")


def test_notif_send_no_auth() -> None:
    try:
        r = httpx.post(
            f"{API}/notifications/send",
            json={"event": "item_added", "title": "x", "body": "y"},
            timeout=15,
        )
        ok = r.status_code == 401
        record("POST /api/notifications/send (no auth)", ok, f"status={r.status_code}")
    except Exception as e:
        record("POST /api/notifications/send (no auth)", False, f"exception={e}")


def test_404() -> None:
    try:
        r = httpx.get(f"{API}/xyz-that-does-not-exist", timeout=15)
        ok = r.status_code == 404
        # Confirm it's FastAPI 404 (JSON {detail:"Not Found"})
        is_fastapi = False
        try:
            j = r.json()
            is_fastapi = j.get("detail") == "Not Found"
        except Exception:
            pass
        record("GET /api/xyz-that-does-not-exist", ok, f"status={r.status_code} fastapi_shape={is_fastapi}")
    except Exception as e:
        record("GET /api/xyz-that-does-not-exist", False, f"exception={e}")


def signup_and_get_jwt() -> tuple[str | None, str | None]:
    """Try to mint a fresh Supabase JWT for tests requiring auth."""
    email = f"deploy_check_{uuid.uuid4().hex[:8]}@listorix.dev"
    password = "Test12345!"
    try:
        r = httpx.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers={"apikey": SUPABASE_ANON, "Content-Type": "application/json"},
            json={"email": email, "password": password},
            timeout=20,
        )
        if r.status_code not in (200, 201):
            print(f"[INFO] signup failed status={r.status_code}: {r.text[:200]}")
            return None, None
        j = r.json()
        token = j.get("access_token")
        if not token:
            # Some configurations require a separate token endpoint
            r2 = httpx.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={"apikey": SUPABASE_ANON, "Content-Type": "application/json"},
                json={"email": email, "password": password},
                timeout=20,
            )
            if r2.status_code == 200:
                token = r2.json().get("access_token")
        return token, email
    except Exception as e:
        print(f"[INFO] signup exception: {e}")
        return None, None


def test_ai_usage_with_auth(token: str) -> None:
    try:
        from datetime import date
        day = date.today().isoformat()
        r = httpx.get(
            f"{API}/ai/usage",
            headers={"Authorization": f"Bearer {token}"},
            params={"day_local": day},
            timeout=20,
        )
        if r.status_code != 200:
            record("GET /api/ai/usage (auth)", False, f"status={r.status_code} body={r.text[:300]}")
            return
        j = r.json()
        ok = (
            j.get("voice_limit") == 20
            and j.get("scan_limit") == 10
            and "voice_count" in j
            and "scan_count" in j
            and "voice_remaining" in j
            and "scan_remaining" in j
        )
        record("GET /api/ai/usage (auth)", ok, f"body={j}")
    except Exception as e:
        record("GET /api/ai/usage (auth)", False, f"exception={e}")


def test_notif_send_validation_with_auth(token: str) -> None:
    try:
        # Missing required body fields (title, body)
        r = httpx.post(
            f"{API}/notifications/send",
            headers={"Authorization": f"Bearer {token}"},
            json={"event": "item_added"},  # missing title + body
            timeout=20,
        )
        ok = r.status_code == 422
        record(
            "POST /api/notifications/send (auth, missing fields)",
            ok,
            f"status={r.status_code} body={r.text[:200]}",
        )
    except Exception as e:
        record("POST /api/notifications/send (auth, missing fields)", False, f"exception={e}")


def main() -> int:
    print(f"=== Listorix Deployment Readiness Health Check ===")
    print(f"Target: {API}")
    print()

    # 1. Health probes (no auth)
    test_top_health()
    test_ai_health()
    test_notif_health()

    # 2. Auth gates without token
    test_ai_usage_no_auth()
    test_voice_no_auth()
    test_scan_no_auth()
    test_notif_send_no_auth()

    # 3. 404 routing
    test_404()

    # 4. With JWT (signup a fresh user)
    print("\n--- Attempting Supabase signup for authed tests ---")
    token, email = signup_and_get_jwt()
    if token:
        print(f"[INFO] Got JWT for {email} (truncated): {token[:24]}...")
        test_ai_usage_with_auth(token)
        test_notif_send_validation_with_auth(token)
    else:
        print("[INFO] No JWT minted — auth-required positive tests SKIPPED. "
              "401 behaviour without token is verified above.")
        results.append(("Authed positive tests", "SKIP", "Could not mint JWT via Supabase signup"))

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    pass_count = sum(1 for _, s, _ in results if s == "PASS")
    fail_count = sum(1 for _, s, _ in results if s == "FAIL")
    skip_count = sum(1 for _, s, _ in results if s == "SKIP")
    for ep, st, dt in results:
        print(f"  {st:5s} {ep}")
    print(f"\nTotals: {pass_count} pass / {fail_count} fail / {skip_count} skip")

    if fail_count == 0:
        print("VERDICT: GREEN")
        return 0
    elif fail_count <= 1:
        print("VERDICT: YELLOW")
        return 1
    else:
        print("VERDICT: RED")
        return 2


if __name__ == "__main__":
    sys.exit(main())
