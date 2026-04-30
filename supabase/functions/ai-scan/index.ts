// Supabase Edge Function: ai-scan
// Replaces POST /api/ai/scan/receipt
//
// Request: multipart/form-data with fields:
//   - image (file, required)
//   - day_local (YYYY-MM-DD, optional)
//
// Response: { ok, source, currency, items, usage }
//
// NOTE: The FastAPI version compressed the image with Pillow before sending to
// OpenAI Vision. Deno has no Pillow equivalent, so we send the image as-is.
// OpenAI's vision API accepts images up to 20 MB — our 12 MB cap still applies.
// Callers that want client-side compression can do so before upload.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getCallerId, serviceClient, todayLocal } from '../_shared/auth.ts';
import { getQuotaRow, incQuota, DAILY_SCAN_LIMIT } from '../_shared/quota.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const SCAN_SYSTEM_PROMPT = `You read shopping bills and grocery-app screenshots (Zepto, Swiggy Instamart, Blinkit, BigBasket, Dunzo, paper receipts, or photos of handwritten lists).

Extract every distinct line item the user actually purchased or listed. For each item return:
 - name (clean English, e.g., \"Tomato\" not \"TOM RED FRESH 1KG\")
 - quantity (number; default 1 if not visible)
 - unit (kg, g, L, ml, pcs, dozen, packets, bottles; \"\" if unclear)
 - price (the displayed line item price as a number; 0 if not visible)
 - a fitting category and emoji

Detect the source from logos / layout. Detect currency if visible, else \"\".
Skip non-item lines (subtotals, taxes, delivery fee, totals, coupons, promotions, packing charges, GST).
If the image isn't a bill or shopping list, return empty items array and source=\"unknown\".`;

const SCAN_SCHEMA = {
  name: 'scan_parse',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      source: {
        type: 'string',
        enum: ['zepto', 'swiggy', 'blinkit', 'instamart', 'bigbasket', 'receipt', 'list', 'unknown'],
      },
      currency: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string' },
            price: { type: 'number' },
            category: {
              type: 'string',
              enum: ['Vegetables', 'Fruits', 'Dairy', 'Grains', 'Snacks',
                     'Beverages', 'Household', 'Personal Care', 'Other'],
            },
            emoji: { type: 'string' },
          },
          required: ['name', 'quantity', 'unit', 'price', 'category', 'emoji'],
        },
      },
    },
    required: ['source', 'currency', 'items'],
  },
};

function base64FromBytes(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

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
  const image = form.get('image');
  const dayLocal = todayLocal((form.get('day_local') as string | null) ?? undefined);
  if (!(image instanceof File)) {
    return jsonResponse({ error: 'image_missing' }, { status: 400 });
  }
  if (image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    return jsonResponse({ error: 'image_too_large' }, { status: 400 });
  }

  // Quota pre-check
  const sb = serviceClient();
  const row = await getQuotaRow(sb, callerId, dayLocal);
  if ((row.scan_count ?? 0) >= DAILY_SCAN_LIMIT) {
    return jsonResponse(
      {
        error: 'scan_quota_exceeded',
        message: `You've used all ${DAILY_SCAN_LIMIT} scans for today. Try again tomorrow.`,
        scan_count: row.scan_count,
        scan_limit: DAILY_SCAN_LIMIT,
      },
      { status: 429 },
    );
  }

  // Build data URL (JPEG/PNG pass-through; no server-side compression here)
  const buf = new Uint8Array(await image.arrayBuffer());
  const mime = image.type || 'image/jpeg';
  const dataUrl = `data:${mime};base64,${base64FromBytes(buf)}`;

  const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SCAN_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Parse this image into structured items.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: 'json_schema', json_schema: SCAN_SCHEMA },
      temperature: 0,
      max_tokens: 2000,
    }),
  });
  if (!visionRes.ok) {
    const txt = await visionRes.text();
    return jsonResponse({ error: 'scan_failed', detail: txt.slice(0, 500) }, { status: 502 });
  }
  const visionJson = await visionRes.json();
  let parsed: any = {};
  try { parsed = JSON.parse(visionJson.choices?.[0]?.message?.content ?? '{}'); } catch { /* ignore */ }

  const items = parsed.items ?? [];
  let usage = { scan_count: row.scan_count, scan_limit: DAILY_SCAN_LIMIT };
  if (items.length > 0) {
    const updated = await incQuota(sb, callerId, dayLocal, { scan: 1 });
    usage = { scan_count: updated.scan_count, scan_limit: DAILY_SCAN_LIMIT };
  }

  return jsonResponse({
    ok: items.length > 0,
    source: parsed.source ?? 'unknown',
    currency: parsed.currency ?? '',
    items,
    usage,
  });
});
