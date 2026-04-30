# Listorix Supabase Edge Functions

Zero-server AI + push pipeline running on Supabase Edge Functions (Deno).
Replaces the FastAPI `/api/ai/*` and `/api/notifications/*` routes.

## Functions

| Function                | Replaces FastAPI path              | Purpose                                    |
| ----------------------- | ---------------------------------- | ------------------------------------------ |
| `ai-usage`              | `GET  /api/ai/usage`               | Read today's voice/scan usage quota        |
| `ai-voice`              | `POST /api/ai/voice/transcribe`    | Whisper + GPT-4o-mini parse                |
| `ai-scan`               | `POST /api/ai/scan/receipt`        | GPT-4o vision parse of bills / screenshots |
| `notifications-send`    | `POST /api/notifications/send`     | Expo push to group members                 |

All four require a valid Supabase JWT in `Authorization: Bearer <token>`.

## Required secrets (set once per project)

```bash
supabase secrets set OPENAI_API_KEY=sk-…
# SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
# are auto-injected by the runtime — you don't set them.
```

## Deploy (all four at once)

```bash
cd /app
supabase login                         # once, pick the Listorix project
supabase link --project-ref vdvrkzeproulsrbguhgt

supabase functions deploy ai-usage --no-verify-jwt=false
supabase functions deploy ai-voice --no-verify-jwt=false
supabase functions deploy ai-scan --no-verify-jwt=false
supabase functions deploy notifications-send --no-verify-jwt=false
```

> **Note**: `--no-verify-jwt=false` keeps Supabase's own JWT check in front of
> every request (defence in depth). Our `getCallerId` inside the function
> still re-verifies to extract the user_id.

## Local development / debugging

```bash
cd /app
supabase functions serve ai-usage --env-file supabase/.env.local
# then:  curl -H "Authorization: Bearer <jwt>" http://localhost:54321/functions/v1/ai-usage
```

`supabase/.env.local` should contain:
```
OPENAI_API_KEY=sk-…
SUPABASE_URL=…
SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…
```

## Feature flag cutover

Frontend reads `EXPO_PUBLIC_USE_EDGE_FUNCTIONS`:
- `false` (dev/preview builds) → calls FastAPI at `EXPO_PUBLIC_BACKEND_URL`
- `true` (production build)    → calls Supabase Edge Functions

`eas.json` has `EXPO_PUBLIC_USE_EDGE_FUNCTIONS: "true"` under the production
profile; that's the only place you need to flip it.

Roll back instantly by re-building production with the flag set to `"false"` —
no code change, no redeploy.

## Observability

```bash
supabase functions logs ai-voice --tail
```

Tail all 4 by piping `--function ai-voice,ai-scan,ai-usage,notifications-send`
if you're on CLI ≥ v1.160.

## Sanity curl

```bash
JWT=…   # valid Supabase JWT
SUP=https://vdvrkzeproulsrbguhgt.supabase.co

curl -H "Authorization: Bearer $JWT" \
  "$SUP/functions/v1/ai-usage?day_local=$(date +%F)"
# expected: {"day_local":"...","voice_count":0,"voice_limit":20, ...}
```
