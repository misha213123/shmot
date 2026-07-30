const CACHE_PREFIX = 'driply.instant-response.v3.';
const CACHE_TTL = 1000 * 60 * 10;

type CachedResponse = {
  savedAt: number;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

function cacheKey(url: string): string { return `${CACHE_PREFIX}${url}`; }

function readCache(url: string): CachedResponse | null {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const value = JSON.parse(raw) as CachedResponse;
    if (!value || Date.now() - value.savedAt > CACHE_TTL) return null;
    return value;
  } catch { return null; }
}

function writeCache(url: string, response: CachedResponse): void {
  try { localStorage.setItem(cacheKey(url), JSON.stringify(response)); } catch { /* ignore */ }
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
}

function shouldCache(input: RequestInfo | URL, init?: RequestInit): boolean {
  if (methodOf(input, init) !== 'GET') return false;
  const url = urlOf(input);
  if (!url.includes('/api/v1/')) return false;
  if (url.includes('/notifications')) return false;
  if (url.includes('/admin/me')) return false;
  return /\/api\/v1\/(products|profiles|me\/products|me\/chats|me\/following|trending|me\/recommendations|me\/recently-viewed)/.test(url);
}

async function storeFresh(url: string, response: Response): Promise<void> {
  if (!response.ok) return;
  const clone = response.clone();
  const body = await clone.text();
  writeCache(url, {
    savedAt: Date.now(),
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  });
  window.dispatchEvent(new CustomEvent('driply:cache-refreshed', { detail: { url } }));
}

export function enableInstantMarketplaceCache(): void {
  if (typeof window === 'undefined' || (window as Window & { __driplyFetchCacheV3?: boolean }).__driplyFetchCacheV3) return;
  const nativeFetch = window.fetch.bind(window);
  (window as Window & { __driplyFetchCacheV3?: boolean }).__driplyFetchCacheV3 = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!shouldCache(input, init)) return nativeFetch(input, init);
    const url = urlOf(input);
    const cached = readCache(url);
    if (cached) {
      void nativeFetch(input, init).then((response) => storeFresh(url, response)).catch(() => undefined);
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
      });
    }
    const response = await nativeFetch(input, init);
    await storeFresh(url, response);
    return response;
  };
}
