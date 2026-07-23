import { useEffect, useState } from 'react';
import { Archive, RefreshCw, Shield, Trash2, Users } from 'lucide-react';

import { API_URL } from '../lib/api';
import { auth } from '../lib/auth';
import '../styles/admin.css';

type Stats = { users: number; products: number; active_products: number; sold_products: number };
type AdminUser = { id: string; email: string | null; username: string; display_name: string; country_code: string; city: string; is_verified: boolean };
type AdminProduct = { id: string; title: string; brand: string; status: string; price: string; currency: string; seller_id: string; seller_username: string };

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await auth.accessToken();
  if (!token) throw new Error('Сначала войдите в аккаунт администратора');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(body.detail || `Ошибка ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export default function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [tab, setTab] = useState<'products' | 'users'>('products');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [nextStats, nextUsers, nextProducts] = await Promise.all([
        adminRequest<Stats>('/api/v1/admin/stats'),
        adminRequest<AdminUser[]>('/api/v1/admin/users'),
        adminRequest<AdminProduct[]>('/api/v1/admin/products'),
      ]);
      setStats(nextStats); setUsers(nextUsers); setProducts(nextProducts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить админ-панель');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (product: AdminProduct, status: string) => {
    try {
      const updated = await adminRequest<AdminProduct>(`/api/v1/admin/products/${product.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setProducts((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось изменить статус'); }
  };

  const remove = async (product: AdminProduct) => {
    if (!window.confirm(`Удалить объявление «${product.title}»?`)) return;
    try {
      await adminRequest(`/api/v1/admin/products/${product.id}`, { method: 'DELETE' });
      setProducts((items) => items.filter((item) => item.id !== product.id));
      setStats((value) => value ? { ...value, products: Math.max(0, value.products - 1) } : value);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось удалить товар'); }
  };

  return <main className="admin-shell">
    <header className="admin-header">
      <div><span>DRIPLY</span><h1>Админ-панель</h1></div>
      <button onClick={load} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> Обновить</button>
    </header>

    {error && <div className="admin-error">{error}</div>}

    <section className="admin-stats">
      <article><Users /><b>{stats?.users ?? '—'}</b><span>Пользователей</span></article>
      <article><Shield /><b>{stats?.products ?? '—'}</b><span>Объявлений</span></article>
      <article><b>{stats?.active_products ?? '—'}</b><span>Активных</span></article>
      <article><b>{stats?.sold_products ?? '—'}</b><span>Продано</span></article>
    </section>

    <nav className="admin-tabs">
      <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Объявления</button>
      <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Пользователи</button>
    </nav>

    {tab === 'products' ? <section className="admin-list">
      {products.map((product) => <article className="admin-card" key={product.id}>
        <div><strong>{product.title}</strong><span>{product.brand} · @{product.seller_username}</span><b>{product.price} {product.currency}</b></div>
        <select value={product.status} onChange={(event) => setStatus(product, event.target.value)}>
          <option value="active">Активно</option><option value="reserved">Забронировано</option><option value="sold">Продано</option><option value="archived">Архив</option><option value="draft">Черновик</option>
        </select>
        <button className="danger" onClick={() => remove(product)}><Trash2 size={18} /></button>
      </article>)}
    </section> : <section className="admin-list">
      {users.map((user) => <article className="admin-card admin-user" key={user.id}>
        <div><strong>{user.display_name}</strong><span>@{user.username}</span><small>{user.email || 'Без email'} · {user.city}, {user.country_code}</small></div>
        {user.is_verified && <Shield size={18} />}
      </article>)}
    </section>}

    <a className="admin-back" href="/">Вернуться в DRIPLY</a>
  </main>;
}
