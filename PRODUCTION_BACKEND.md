# Production Backend Deployment — Decision Guide

**Why this matters**: The `preview.emergentagent.com` URL is an **ephemeral dev container**.
Once you submit to the App Store, users will install a binary that hard-codes
`EXPO_PUBLIC_BACKEND_URL` at build time. If that URL goes offline, **all AI
features (voice/scan) and push notifications break** for every installed user.

App Store submissions **must** point to a stable, owned production domain. The
`eas.json` `production` profile now uses the placeholder
`https://api.listorix.com` — you need to make this real.

---

## Three production deployment paths

Pick ONE of A/B/C, then follow its steps.

### A. Emergent native deployment (simplest — recommended for speed)
Emergent can deploy the current FastAPI backend to a persistent domain.

**Steps**:
1. Click the "Deploy" button in the Emergent dashboard (top-right).
2. Emergent provisions a stable subdomain like `listorix.emergentagent.app`.
3. **(optional)** Point a CNAME from `api.listorix.com` → that subdomain.
4. Update `eas.json` production `EXPO_PUBLIC_BACKEND_URL` to match.

**Cost**: Managed hosting pricing. Zero ops work.

---

### B. Self-host FastAPI (Railway / Render / Fly.io)
You own the infra and domain.

**Steps**:
1. Create a repo containing just `/app/backend/` plus a `Dockerfile`:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   EXPOSE 8001
   CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
   ```
2. Push to Railway/Render/Fly. Set env vars:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
   - `MONGO_URL` (only if you're keeping the status_check endpoints;
     honestly for Listorix you don't need Mongo at all — Supabase carries
     everything. Consider removing Mongo from the deploy.)
3. Set up a custom domain `api.listorix.com` → your provider's URL.
4. Make sure the provider's health check hits `/api/health` (returns 200).
5. Update `eas.json` production `EXPO_PUBLIC_BACKEND_URL` to `https://api.listorix.com`.

**Cost**: ~$5–15/mo. Moderate ops work.

---

### C. Migrate backend → Supabase Edge Functions (zero-server)
The only things the FastAPI backend actually does:
- `POST /api/ai/voice/transcribe` → OpenAI Whisper + GPT-4o-mini parsing
- `POST /api/ai/scan/receipt` → OpenAI GPT-4o vision parsing
- `GET /api/ai/usage` → read `usage_quotas` table
- `POST /api/notifications/send` → Expo Push HTTP

All four can live in **Supabase Edge Functions** (Deno runtime, free tier,
auto-scales, no server to maintain).

**Steps**:
1. In Supabase Dashboard → Edge Functions, create 4 functions:
   `ai-voice`, `ai-scan`, `ai-usage`, `notifications-send`.
2. Port the Python logic to TypeScript (Supabase has first-class examples
   for OpenAI + Expo Push). ~1 day of work.
3. Frontend calls become `supabase.functions.invoke('ai-voice', {body})`.
4. Update `eas.json` production `EXPO_PUBLIC_BACKEND_URL` to **nothing**
   (the frontend stops making absolute URL calls).
5. Retire the FastAPI server entirely.

**Cost**: Free until Supabase Edge Functions quota exceeded (2 M invocations / mo).
Most ops-free option.

---

## What to do right now — minimal viable step

Until you decide on A/B/C, **do not ship to the App Store**.

For testing the production-flavoured EAS build RIGHT NOW on your own devices, you
can temporarily point production → your stable preview URL:

```bash
# Run this ONLY if you want a personal production-build for testing:
# NOT FOR APP STORE SUBMISSION.
# Temporarily restore the preview URL in eas.json > production > env.
```

Once you pick a path (A/B/C) and have a real `api.listorix.com`, update
`eas.json` production `EXPO_PUBLIC_BACKEND_URL` and build.

---

## Frontend-side gotchas to double-check after switching

1. **CORS** — your new FastAPI host must allow the App Store build origin.
   FastAPI already has `CORSMiddleware(allow_origins=["*"])`, so you're fine,
   but change to `["https://listorix.com", "exp://..."]` for tighter security.
2. **HTTPS** — iOS ATS rejects plain HTTP. Your new domain must have a valid
   TLS cert (Let's Encrypt works, Railway/Render/Fly.io do this automatically).
3. **Universal links** — `https://listorix.com/join/*` (invite links) needs
   `.well-known/apple-app-site-association` and `assetlinks.json` hosted.
   Different concern from the backend URL, but comes up in the same domain
   purchase conversation.

---

## Final `eas.json` production env (after you pick a path)

```jsonc
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_BACKEND_URL": "https://api.listorix.com",   // <- must be stable
        "EXPO_PUBLIC_SUPABASE_URL": "https://vdvrkzeproulsrbguhgt.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_...",
        "EXPO_PUBLIC_INVITE_BASE_URL": "https://listorix.com/join",
        "EXPO_PUBLIC_APP_SCHEME": "listorix"
      }
    }
  }
}
```
