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

export type ProductListResponse = {
  items: ApiProduct[];
  total: number;
};

export type CreateProfileInput = {
  email?: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  phone?: string;
  country_code: string;
  city: string;
  bio?: string;
};

export type CreateProductInput = {
  seller_id: string;
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = `Ошибка API: ${response.status}`;
    try {
      const body = await response.json() as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Response may not contain JSON.
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
    const suffix = search.size ? `?${search.toString()}` : '';
    return request<ProductListResponse>(`/api/v1/products${suffix}`);
  },

  product: (productId: string) => request<ApiProduct>(`/api/v1/products/${productId}`),

  createProfile: (payload: CreateProfileInput) => request('/api/v1/profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  createProduct: (payload: CreateProductInput) => request<ApiProduct>('/api/v1/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  recordView: (productId: string, userId?: string) => request(`/api/v1/products/${productId}/view`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId || null }),
  }),

  swipe: (productId: string, userId: string, action: SwipeAction) => request(`/api/v1/products/${productId}/swipe`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, action }),
  }),

  addFavorite: (productId: string, userId: string) => request(`/api/v1/products/${productId}/favorite`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }),

  removeFavorite: (productId: string, userId: string) => request(`/api/v1/products/${productId}/favorite?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  }),

  favorites: (userId: string) => request<ProductListResponse>(`/api/v1/profiles/${userId}/favorites`),
};

export { API_URL, ApiError };
