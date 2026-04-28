import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'google' | 'apple';

export interface OAuthResult {
  ok: boolean;
  error?: string;
  cancelled?: boolean;
}

/**
 * Open an OAuth flow with the chosen provider, then complete it by
 * extracting the session tokens from the redirect URL and storing them.
 *
 * Works in:
 *  - Expo Go (scheme: listorix://)
 *  - Web preview (https://*.preview.emergentagent.com)
 *  - Standalone builds (https://listorix.com/auth/callback)
 */
export async function signInWithProvider(provider: Provider): Promise<OAuthResult> {
  try {
    // 1) Decide a redirect URL the Supabase dashboard trusts
    //    Linking.createURL picks the right scheme/host for the current environment.
    const redirectTo = Linking.createURL('auth/callback');

    // 2) Ask Supabase for the provider URL (don't auto-redirect; we'll open it ourselves)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      return { ok: false, error: error?.message ?? 'Could not start OAuth' };
    }

    // 3) Open the provider's consent page in a safe auth session.
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (res.type === 'cancel' || res.type === 'dismiss') {
      return { ok: false, cancelled: true };
    }

    if (res.type !== 'success' || !res.url) {
      return { ok: false, error: 'OAuth failed' };
    }

    // 4) Parse session tokens out of the redirect URL.
    //    Supabase returns either a #fragment (implicit) or ?code= (PKCE).
    const url = res.url;
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');

    let access_token: string | null = null;
    let refresh_token: string | null = null;
    let code: string | null = null;

    if (hashIndex >= 0) {
      const params = new URLSearchParams(url.substring(hashIndex + 1));
      access_token = params.get('access_token');
      refresh_token = params.get('refresh_token');
    }
    if (!access_token && queryIndex >= 0) {
      const params = new URLSearchParams(url.substring(queryIndex + 1));
      code = params.get('code');
    }

    if (access_token && refresh_token) {
      const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sErr) return { ok: false, error: sErr.message };
      return { ok: true };
    }

    if (code) {
      const { error: cErr } = await supabase.auth.exchangeCodeForSession(code);
      if (cErr) return { ok: false, error: cErr.message };
      return { ok: true };
    }

    return { ok: false, error: 'No session returned from OAuth' };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export const isAppleAvailable = Platform.OS === 'ios' || Platform.OS === 'web';
export const isGoogleAvailable = true;
