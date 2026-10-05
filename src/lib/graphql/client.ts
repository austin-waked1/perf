// FORMA Store — WPGraphQL client (live WordPress transport).
//
// All store data (products, categories, cart, checkout) flows through this
// client when NEXT_PUBLIC_WORDPRESS_URL is configured. It:
//   - POSTs GraphQL documents to the live WordPress endpoint
//   - manages the WooGraphQL cart session: the `woocommerce-session` JWT
//     returned by the server is captured from response headers and replayed
//     as `woocommerce-session: Session <token>` on every request
//   - persists the session token in localStorage so the cart survives reloads
//
// The endpoint exposes `access-control-allow-origin: *` and whitelists /
// exposes the `woocommerce-session` header, so the browser can talk to it
// directly — no proxy required.

export const WORDPRESS_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL ?? '';
export const WORDPRESS_BASE = (() => {
  try {
    return WORDPRESS_URL ? new URL(WORDPRESS_URL).origin : '';
  } catch {
    return '';
  }
})();

export const isWordPressConfigured = (): boolean => WORDPRESS_URL.length > 0;

const SESSION_KEY = 'forma-wp-session';
const isBrowser = typeof window !== 'undefined';

export interface GQLError extends Error {
  errors?: { message: string }[];
  code?: 'NETWORK' | 'GRAPHQL' | 'EMPTY';
}

// ── WooGraphQL cart session token (localStorage) ────────────────────────────

export function getWooSession(): string | null {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setWooSession(token: string): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    /* storage unavailable (private mode) — cart session becomes ephemeral */
  }
}

export function clearWooSession(): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

// ── Transport ───────────────────────────────────────────────────────────────

export async function gqlFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  opts: { timeoutMs?: number } = {}
): Promise<T> {
  if (!WORDPRESS_URL) {
    throw Object.assign(new Error('NEXT_PUBLIC_WORDPRESS_URL is not configured'), {
      code: 'EMPTY',
    }) as GQLError;
  }

  const token = getWooSession();

  let res: Response;
  try {
    res = await fetch(WORDPRESS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'woocommerce-session': `Session ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
      signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Network error — the WordPress store could not be reached.'), {
      code: 'NETWORK',
    }) as GQLError;
  }

  // WooGraphQL issues/refreshes a cart session JWT in the response header.
  const session = res.headers.get('woocommerce-session');
  if (session) {
    setWooSession(session.replace(/^Session\s+/i, '').trim());
  }

  let json: { data?: T; errors?: { message: string }[] };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw Object.assign(new Error(`Invalid GraphQL response (HTTP ${res.status})`), {
      code: 'EMPTY',
    }) as GQLError;
  }

  if (json.errors?.length) {
    throw Object.assign(new Error(json.errors[0].message), {
      errors: json.errors,
      code: 'GRAPHQL',
    }) as GQLError;
  }
  if (!json.data) {
    throw Object.assign(new Error('Empty GraphQL response'), { code: 'EMPTY' }) as GQLError;
  }
  return json.data;
}

/** True when the error means the stored Woo session is no longer usable. */
export function isSessionError(err: unknown): boolean {
  const e = err as GQLError;
  if (!e) return false;
  const msg = String(e.message ?? '').toLowerCase();
  return (
    msg.includes('session') &&
    (msg.includes('invalid') || msg.includes('expired') || msg.includes('not valid') || msg.includes('empty'))
  );
}
