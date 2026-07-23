import { auth } from './auth';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export type ProductStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'archived';
export type SwipeAction = 'like' | 'skip';

export type SellerSummary = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  city: string;
  country_code: string;
  is_verified: boolean;
  rating: string;
};

export type ProductImage = {
  id: string;
  url: string;
  position: number;
  is_cover: boolean;
};

export type ApiProduct = {
  id: string;
  seller_id: string;
  title: string;
  brand: string;
  category: string;
  description: string;
  size: string | null;
  color: string | null;
  condition: string;
  price: string;
  currency: string;
  country_code: string;
  city: string;
  delivery: string | null;
  status: ProductStatus;
  views_count: number;
  favorites_count: number;
  created_at: string;
  images: ProductImage[];
  seller: SellerSummary;
};

export type ApiProfile = {
  id: string;
  email: string | null;
  username: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  country_code: string;
  city: string;
  bio: string | null;
  is_verified: boolean;
  rating: string;
  created_at: string;
};

export type ProductListResponse = { items: ApiProduct[]; total: number };

export type ProfileInput = {
  username: string;
  display_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  country_code: string;
  city: string;
  bio?: string | null;
};

export type CreateProductInput = {
  seller_id?: string;
  title: string;
  brand: string;
  category: string;
  description: string;
  size?: string;
  color?: string;
  condition: string;
  price: number;
  currency: string;
  country_code: string;
  city: string;
  delivery?: string;
  images: Array<{ url: string; position: number; is_cover: boolean }>;
};

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit, protectedRoute = false): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  if (protectedRoute) {
    const token = await auth.accessToken();
    if (!token) throw new ApiError(401, 'Сначала войдите в аккаунт');
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Ошибка API: ${response.status}`;
    try {
      const body = await response.json() as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // The response can be empty or non-JSON.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ health: string; environment: string }>('/health'),

  products: (params: Record<string, string | number | undefined> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') search.set(key, String(value));
    });
    return request<ProductListResponse>(`/api/v1/products${search.size ? `?${search}` : ''}`);
  },

  product: (productId: string) => request<ApiProduct>(`/api/v1/products/${productId}`),

  myProfile: () => request<ApiProfile>('/api/v1/me/profile', undefined, true),
  saveMyProfile: (payload: ProfileInput) => request<ApiProfile>('/api/v1/me/profile', {
    method: 'PUT', body: JSON.stringify(payload),
  }, true),

  myProducts: () => request<ProductListResponse>('/api/v1/me/products', undefined, true),
  createMyProduct: (payload: CreateProductInput) => request<ApiProduct>('/api/v1/me/products', {
    method: 'POST', body: JSON.stringify(payload),
  }, true),

  swipe: (productId: string, action: SwipeAction) => request(`/api/v1/me/products/${productId}/swipe`, {
    method: 'POST', body: JSON.stringify({ action }),
  }, true),

  addFavorite: (productId: string) => request(`/api/v1/me/products/${productId}/favorite`, {
    method: 'POST', body: JSON.stringify({}),
  }, true),

  recordView: (productId: string) => request(`/api/v1/products/${productId}/view`, {
    method: 'POST', body: JSON.stringify({ user_id: null }),
  }),
};

export { API_URL, ApiError };
