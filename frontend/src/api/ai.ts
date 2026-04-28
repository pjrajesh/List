import { supabase } from '../lib/supabase';

const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL as string | undefined)?.replace(/\/$/, '') || '';

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  emoji: string;
  price?: number;
}

export interface VoiceResult {
  ok: boolean;
  is_shopping_intent: boolean;
  rejection_reason: string;
  transcript: string;
  items: ParsedItem[];
  usage: { voice_count: number; voice_limit: number };
}

export interface ScanResult {
  ok: boolean;
  source: string;
  currency: string;
  items: ParsedItem[];
  usage: { scan_count: number; scan_limit: number };
}

export interface UsageToday {
  day_local: string;
  voice_count: number;
  voice_limit: number;
  voice_remaining: number;
  scan_count: number;
  scan_limit: number;
  scan_remaining: number;
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function getJwt(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetchUsageToday(): Promise<UsageToday | null> {
  try {
    const jwt = await getJwt();
    if (!jwt) return null;
    const res = await fetch(`${BACKEND_URL}/api/ai/usage?day_local=${todayLocal()}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as UsageToday;
  } catch {
    return null;
  }
}

export class QuotaError extends Error {
  status: number;
  detail: any;
  constructor(status: number, detail: any) {
    super(typeof detail?.message === 'string' ? detail.message : 'Quota exceeded');
    this.status = status;
    this.detail = detail;
  }
}

export async function transcribeVoice(audioUri: string, mime: string = 'audio/m4a'): Promise<VoiceResult> {
  const jwt = await getJwt();
  if (!jwt) throw new Error('Not authenticated');

  const form = new FormData();
  // React Native FormData accepts {uri, name, type}
  form.append('audio', {
    uri: audioUri,
    name: 'speech.m4a',
    type: mime,
  } as any);
  form.append('day_local', todayLocal());

  const res = await fetch(`${BACKEND_URL}/api/ai/voice/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form as any,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 429) throw new QuotaError(429, json?.detail ?? json);
  if (!res.ok) throw new Error(json?.detail || `Voice failed (${res.status})`);
  return json as VoiceResult;
}

export async function scanReceipt(imageUri: string, mime: string = 'image/jpeg'): Promise<ScanResult> {
  const jwt = await getJwt();
  if (!jwt) throw new Error('Not authenticated');

  const form = new FormData();
  form.append('image', {
    uri: imageUri,
    name: 'receipt.jpg',
    type: mime,
  } as any);
  form.append('day_local', todayLocal());

  const res = await fetch(`${BACKEND_URL}/api/ai/scan/receipt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form as any,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 429) throw new QuotaError(429, json?.detail ?? json);
  if (!res.ok) throw new Error(json?.detail || `Scan failed (${res.status})`);
  return json as ScanResult;
}
