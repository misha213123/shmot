const CACHE_PREFIX = 'driply.api-cache.';
const CACHE_TTL = 1000 * 60 * 30;

type CachedResponse = {
  savedAt: number;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

function cacheKey(url: string): string {
  return `${CACHE_PREFIX}${url}`;
}

function readCache(url: string): CachedResponse | null {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const value = JSON.parse(raw) as CachedResponse;
    if (Date.now() - value.savedAt > CACHE_TTL) return null;
    return value;
  } catch {
    return null;
  }
}

function writeCache(url: string, response: CachedResponse): void {
  try {
    localStorage.setItem(cacheKey(url), JSON.stringify(response));
  } catch {
    // The app still works when local storage is unavailable.
  }
}

function shouldCache(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (method !== 'GET') return false;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  return url.includes('/api/v1/products') && url.includes('status=active');
}

export function enableInstantMarketplaceCache(): void {
  if (typeof window === 'undefined' || (window as Window & { __driplyFetchCache?: boolean }).__driplyFetchCache) return;

  const nativeFetch = window.fetch.bind(window);
  (window as Window & { __driplyFetchCache?: boolean }).__driplyFetchCache = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!shouldCache(input, init)) return nativeFetch(input, init);

    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const cached = readCache(url);

    if (cached) {
      void nativeFetch(input, init)
        .then(async (response) => {
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
        })
        .catch(() => undefined);

      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
      });
    }

    const response = await nativeFetch(input, init);
    if (response.ok) {
      const clone = response.clone();
      const body = await clone.text();
      writeCache(url, {
        savedAt: Date.now(),
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body,
      });
    }
    return response;
  };
}
