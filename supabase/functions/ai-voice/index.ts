// Supabase Edge Function: ai-voice
// Replaces POST /api/ai/voice/transcribe
//
// Request: multipart/form-data with fields:
//   - audio (file, required)
//   - day_local (YYYY-MM-DD, optional)
//
// Response: { ok, is_shopping_intent, rejection_reason, transcript, items, usage }
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getCallerId, serviceClient, todayLocal } from '../_shared/auth.ts';
import { getQuotaRow, incQuota, DAILY_VOICE_LIMIT } from '../_shared/quota.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB

const VOICE_SYSTEM_PROMPT = `You convert spontaneous spoken shopping requests into structured grocery items.

Strict rules:
1) First decide: is_shopping_intent. True ONLY if the user is naming items to buy.
   Set FALSE for songs/lyrics/poetry/music, gibberish, silence, or any unrelated talk.
   When false, set rejection_reason to one of: song, music, gibberish, unrelated, silence. Return items=[].
2) When TRUE, extract distinct items.
3) Normalize: English singular item names. Translate Hindi/Tamil/Telugu/Bengali to English.
4) Pick fitting emoji and closest category from the enum.
5) Quantity must be a positive number (default 1 if not stated). unit can be \"\" (empty).`;

const VOICE_SCHEMA = {
  name: 'voice_parse',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      is_shopping_intent: { type: 'boolean' },
      rejection_reason: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string' },
            category: {
              type: 'string',
              enum: ['Vegetables', 'Fruits', 'Dairy', 'Grains', 'Snacks',
                     'Beverages', 'Household', 'Personal Care', 'Other'],
            },
            emoji: { type: 'string' },
          },
          required: ['name', 'quantity', 'unit', 'category', 'emoji'],
        },
      },
    },
    required: ['is_shopping_intent', 'rejection_reason', 'items'],
  },
};

Deno.serve(async (req: Request) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, { status: 405 });
  }
  if (!OPENAI_API_KEY) {
    return jsonResponse({ error: 'openai_not_configured' }, { status: 503 });
  }

  const callerId = await getCallerId(req);
  if (!callerId) return jsonResponse({ error: 'unauthenticated' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return jsonResponse({ error: 'invalid_form' }, { status: 400 });
  const audio = form.get('audio');
  const dayLocal = todayLocal((form.get('day_local') as string | null) ?? undefined);
  if (!(audio instanceof File)) {
    return jsonResponse({ error: 'audio_missing' }, { status: 400 });
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return jsonResponse({ error: 'audio_too_large' }, { status: 400 });
  }

  // Quota pre-check
  const sb = serviceClient();
  const row = await getQuotaRow(sb, callerId, dayLocal);
  if ((row.voice_count ?? 0) >= DAILY_VOICE_LIMIT) {
    return jsonResponse(
      {
        error: 'voice_quota_exceeded',
        message: `You've used all ${DAILY_VOICE_LIMIT} voice attempts for today. Try again tomorrow.`,
        voice_count: row.voice_count,
        voice_limit: DAILY_VOICE_LIMIT,
      },
      { status: 429 },
    );
  }

  // 1) Transcribe via OpenAI Whisper-grade transcription
  const transFd = new FormData();
  transFd.append('file', audio, audio.name || 'speech.m4a');
  transFd.append('model', 'gpt-4o-transcribe');
  const trRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: transFd,
  });
  if (!trRes.ok) {
    const txt = await trRes.text();
    return jsonResponse({ error: 'transcribe_failed', detail: txt.slice(0, 500) }, { status: 502 });
  }
  const { text: transcript = '' } = await trRes.json();

  if (!transcript || !transcript.trim()) {
    // silent / empty — don't burn quota
    return jsonResponse({
      ok: false,
      is_shopping_intent: false,
      rejection_reason: 'silence',
      transcript: '',
      items: [],
      usage: { voice_count: row.voice_count, voice_limit: DAILY_VOICE_LIMIT },
    });
  }

  // 2) Parse into structured items
  const parseRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: VOICE_SYSTEM_PROMPT },
        { role: 'user', content: `Transcript: ${transcript}` },
      ],
      response_format: { type: 'json_schema', json_schema: VOICE_SCHEMA },
      temperature: 0,
    }),
  });
  if (!parseRes.ok) {
    const txt = await parseRes.text();
    return jsonResponse({ error: 'parse_failed', detail: txt.slice(0, 500) }, { status: 502 });
  }
  const parseJson = await parseRes.json();
  let parsed: any = {};
  try { parsed = JSON.parse(parseJson.choices?.[0]?.message?.content ?? '{}'); } catch { /* ignore */ }

  const isShop = !!parsed.is_shopping_intent;
  const items = isShop ? (parsed.items ?? []) : [];

  let usage = { voice_count: row.voice_count, voice_limit: DAILY_VOICE_LIMIT };
  if (isShop && items.length > 0) {
    const updated = await incQuota(sb, callerId, dayLocal, { voice: 1 });
    usage = { voice_count: updated.voice_count, voice_limit: DAILY_VOICE_LIMIT };
  }

  return jsonResponse({
    ok: isShop && items.length > 0,
    is_shopping_intent: isShop,
    rejection_reason: parsed.rejection_reason ?? '',
    transcript,
    items,
    usage,
  });
});
