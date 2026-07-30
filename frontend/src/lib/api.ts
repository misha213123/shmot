import { auth } from './auth';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const PROFILE_REQUEST_TIMEOUT_MS = 10000;

export type ProductStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'archived';
export type SwipeAction = 'like' | 'skip';

export type SellerSummary = {
  id: string; username: string; display_name: string; avatar_url: string | null; city: string;
  country_code: string; is_verified: boolean; rating: string;
};
export type ProductImage = { id: string; url: string; position: number; is_cover: boolean };
export type ApiProduct = {
  id: string; seller_id: string; title: string; brand: string; category: string; description: string;
  size: string | null; color: string | null; condition: string; price: string; currency: string;
  country_code: string; city: string; delivery: string | null; status: ProductStatus;
  views_count: number; favorites_count: number; created_at: string; images: ProductImage[]; seller: SellerSummary;
};
export type ApiProfile = {
  id: string; email: string | null; username: string; display_name: string; avatar_url: string | null;
  phone: string | null; country_code: string; city: string; bio: string | null;
  is_verified: boolean; rating: string; created_at: string;
};
export type ProductListResponse = { items: ApiProduct[]; total: number };
export type ProfileInput = { username: string; display_name: string; avatar_url?: string | null; phone?: string | null; country_code: string; city: string; bio?: string | null };
export type ProductInput = {
  seller_id?: string; title: string; brand: string; category: string; description: string; size?: string;
  color?: string; condition: string; price: number; currency: string; country_code: string; city: string;
  delivery?: string; images: Array<{ url: string; position: number; is_cover: boolean }>;
};
export type CreateProductInput = ProductInput;
export type FollowState = { following: boolean; followers_count: number };
export type ApiNotification = {
  id: string; type: string; title: string; body: string; is_read: boolean;
  actor_id: string | null; product_id: string | null; created_at: string;
};
export type NotificationListResponse = { items: ApiNotification[]; unread_count: number };

const inFlightReads = new Map<string, Promise<unknown>>();
type CacheEnvelope<T> = { value: T; savedAt: number };
const CACHE_PREFIX = 'driply.api-cache.v2.';
const CACHE_MAX_AGE_MS = 1000 * 60 * 30;

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'ApiError'; }
}

async function request<T>(path: string, options?: RequestInit, protectedRoute = false): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  if (protectedRoute) {
    const token = await auth.accessToken();
    if (!token) throw new ApiError(401, 'Сначала войдите в аккаунт');
    headers.set('Authorization', `Bearer ${token}`);
  }

  const execute = async (): Promise<T> => {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!response.ok) {
      let message = `Ошибка API: ${response.status}`;
      try { const body = await response.json() as { detail?: string }; if (body.detail) message = body.detail; } catch { /* non-JSON */ }
      throw new ApiError(response.status, message);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  };

  if (method !== 'GET') return execute();
  const authKey = protectedRoute ? headers.get('Authorization') || 'protected' : 'public';
  const key = `${authKey}:${path}`;
  const existing = inFlightReads.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const pending = execute().finally(() => inFlightReads.delete(key));
  inFlightReads.set(key, pending);
  return pending;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId = 0;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new ApiError(408, message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function cacheKey(key: string) { return `${CACHE_PREFIX}${key}`; }

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null;
    return parsed.value;
  } catch { return null; }
}

function writeCache<T>(key: string, value: T): void {
  try { localStorage.setItem(cacheKey(key), JSON.stringify({ value, savedAt: Date.now() } satisfies CacheEnvelope<T>)); }
  catch { /* private mode or storage limit */ }
}

function clearCache(...keys: string[]): void {
  try { keys.forEach((key) => localStorage.removeItem(cacheKey(key))); } catch { /* ignore */ }
}

async function cachedRequest<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = readCache<T>(key);
  if (cached) {
    void loader().then((fresh) => writeCache(key, fresh)).catch(() => undefined);
    return cached;
  }
  const fresh = await loader();
  writeCache(key, fresh);
  return fresh;
}

export const api = {
  health: () => request<{ health: string; environment: string }>('/health'),
  products: (params: Record<string, string | number | undefined> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)); });
    const suffix = search.size ? `?${search}` : '';
    return request<ProductListResponse>(`/api/v1/products${suffix}`);
  },
  product: (productId: string) => cachedRequest(`product:${productId}`, () => request<ApiProduct>(`/api/v1/products/${productId}`)),
  profile: (profileId: string) => cachedRequest(`profile:${profileId}`, () => request<ApiProfile>(`/api/v1/profiles/${profileId}`)),
  myProfile: () => withTimeout(
    request<ApiProfile>('/api/v1/me/profile', undefined, true),
    PROFILE_REQUEST_TIMEOUT_MS,
    'Сервер слишком долго загружает профиль. Нажми «Повторить».',
  ),
  saveMyProfile: async (payload: ProfileInput) => {
    const result = await request<ApiProfile>('/api/v1/me/profile', { method: 'PUT', body: JSON.stringify(payload) }, true);
    clearCache(`profile:${result.id}`);
    return result;
  },
  myProducts: () => cachedRequest('me:products', () => request<ProductListResponse>('/api/v1/me/products', undefined, true)),
  createMyProduct: async (payload: ProductInput) => {
    const result = await request<ApiProduct>('/api/v1/me/products', { method: 'POST', body: JSON.stringify(payload) }, true);
    clearCache('me:products', 'products:?status=active');
    return result;
  },
  updateMyProduct: async (productId: string, payload: ProductInput) => {
    const result = await request<ApiProduct>(`/api/v1/me/products/${productId}`, { method: 'PUT', body: JSON.stringify(payload) }, true);
    clearCache('me:products', `product:${productId}`, 'products:?status=active');
    return result;
  },
  updateMyProductStatus: async (productId: string, status: ProductStatus) => {
    const result = await request<ApiProduct>(`/api/v1/me/products/${productId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, true);
    clearCache('me:products', `product:${productId}`, 'products:?status=active');
    return result;
  },
  deleteMyProduct: async (productId: string) => {
    const result = await request<{ ok: boolean; message: string }>(`/api/v1/me/products/${productId}`, { method: 'DELETE' }, true);
    clearCache('me:products', `product:${productId}`, 'products:?status=active');
    return result;
  },
  favorites: (profileId: string) => cachedRequest(`favorites:${profileId}`, () => request<ProductListResponse>(`/api/v1/profiles/${profileId}/favorites`)),
  addFavorite: async (productId: string) => {
    const result = await request(`/api/v1/me/products/${productId}/favorite`, { method: 'POST', body: JSON.stringify({}) }, true);
    try {
      const session = await auth.session();
      if (session) clearCache(`favorites:${session.user.id}`);
    } catch { /* ignore */ }
    return result;
  },
  removeFavorite: async (productId: string) => {
    const result = await request(`/api/v1/products/${productId}/favorite`, { method: 'DELETE', body: JSON.stringify({ user_id: null }) }, true);
    try {
      const session = await auth.session();
      if (session) clearCache(`favorites:${session.user.id}`);
    } catch { /* ignore */ }
    return result;
  },
  swipe: (productId: string, action: SwipeAction) => request(`/api/v1/me/products/${productId}/swipe`, { method: 'POST', body: JSON.stringify({ action }) }, true),
  following: () => cachedRequest('me:following', () => request<ApiProfile[]>('/api/v1/me/following', undefined, true)),
  followingProducts: () => cachedRequest('me:following-products', () => request<ProductListResponse>('/api/v1/me/following/products', undefined, true)),
  followState: (sellerId: string) => request<FollowState>(`/api/v1/me/following/${sellerId}`, undefined, true),
  followSeller: (sellerId: string) => request<FollowState>(`/api/v1/me/following/${sellerId}`, { method: 'POST', body: JSON.stringify({}) }, true),
  unfollowSeller: (sellerId: string) => request<FollowState>(`/api/v1/me/following/${sellerId}`, { method: 'DELETE' }, true),
  notifications: () => request<NotificationListResponse>('/api/v1/me/notifications', undefined, true),
  readAllNotifications: () => request<void>('/api/v1/me/notifications/read-all', { method: 'POST', body: JSON.stringify({}) }, true),
  recommendations: () => cachedRequest('me:recommendations', () => request<ProductListResponse>('/api/v1/me/recommendations', undefined, true)),
  recentlyViewed: () => cachedRequest('me:recently-viewed', () => request<ProductListResponse>('/api/v1/me/recently-viewed', undefined, true)),
  similarProducts: (productId: string) => cachedRequest(`similar:${productId}`, () => request<ProductListResponse>(`/api/v1/products/${productId}/similar`)),
  trending: () => cachedRequest('trending', () => request<ProductListResponse>('/api/v1/trending')),
  recordView: (productId: string) => {
    window.dispatchEvent(new CustomEvent('driply:product-opened', { detail: { productId } }));
    clearCache('me:recently-viewed', 'me:recommendations');
    return request(`/api/v1/me/products/${productId}/view`, { method: 'POST', body: JSON.stringify({}) }, true);
  },
};

export { API_URL, ApiError };