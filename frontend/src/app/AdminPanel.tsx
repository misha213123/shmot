import { FormEvent, useEffect, useState } from 'react';
import { DatabaseZap, Flag, RefreshCw, Shield, ShieldCheck, Star, Trash2, UserPlus, Users } from 'lucide-react';

import { API_URL } from '../lib/api';
import { auth } from '../lib/auth';
import '../styles/admin.css';
import '../styles/admin-scroll-fix.css';

type Stats = { users: number; products: number; active_products: number; sold_products: number };
type AdminAccess = { is_admin: boolean; is_owner: boolean; username: string };
type AdminUser = { id: string; email: string | null; username: string; display_name: string; country_code: string; city: string; is_verified: boolean; is_admin: boolean; is_owner: boolean };
type AdminProduct = { id: string; title: string; brand: string; status: string; price: string; currency: string; seller_id: string; seller_username: string };
type AdminReport = { id: string; product_id: string; product_title: string; seller_username: string; reporter_username: string; reason: string; details: string | null; status: string; moderator_note: string | null; created_at: string };
type AdminReview = { id: string; deal_id: string; author_id: string; author_username: string; author_display_name: string; seller_id: string; rating: number; comment: string | null; created_at: string };
type MaintenanceResult = { scope: string; deleted_storage_objects: number; message: string };
type Tab = 'products' | 'users' | 'admins' | 'reports' | 'reviews' | 'maintenance';

const reasonLabels: Record<string, string> = { fake: 'Подделка', prohibited: 'Запрещённый товар', spam: 'Спам', fraud: 'Мошенничество', wrong_info: 'Неверное описание', other: 'Другое' };

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await auth.accessToken();
  if (!token) throw new Error('Сначала войдите в аккаунт администратора');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers || {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(body.detail || `Ошибка ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export default function AdminPanel() {
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [tab, setTab] = useState<Tab>('products');
  const [adminUsername, setAdminUsername] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const me = await adminRequest<AdminAccess>('/api/v1/admin/me');
      setAccess(me);
      if (!me.is_admin) throw new Error('Нет доступа к админ-панели');
      const [nextStats, nextUsers, nextProducts] = await Promise.all([
        adminRequest<Stats>('/api/v1/admin/stats'),
        adminRequest<AdminUser[]>('/api/v1/admin/users'),
        adminRequest<AdminProduct[]>('/api/v1/admin/products'),
      ]);
      setStats(nextStats); setUsers(nextUsers); setProducts(nextProducts);
      const [reportsResult, reviewsResult] = await Promise.allSettled([
        adminRequest<AdminReport[]>('/api/v1/admin/reports'),
        adminRequest<AdminReview[]>('/api/v1/admin/reviews'),
      ]);
      if (reportsResult.status === 'fulfilled') setReports(reportsResult.value);
      if (reviewsResult.status === 'fulfilled') setReviews(reviewsResult.value);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить админ-панель'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const grantAdmin = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    try {
      const updated = await adminRequest<AdminUser>('/api/v1/admin/admins', { method: 'POST', body: JSON.stringify({ username: adminUsername }) });
      setUsers((items) => items.map((item) => item.id === updated.id ? updated : item));
      setAdminUsername(''); setMessage(`@${updated.username} теперь администратор`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось выдать права'); }
  };

  const revokeAdmin = async (user: AdminUser) => {
    if (!window.confirm(`Снять права администратора у @${user.username}?`)) return;
    try {
      await adminRequest(`/api/v1/admin/admins/${encodeURIComponent(user.username)}`, { method: 'DELETE' });
      setUsers((items) => items.map((item) => item.id === user.id ? { ...item, is_admin: false } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось снять права'); }
  };

  const setStatus = async (product: AdminProduct, status: string) => {
    try {
      const updated = await adminRequest<AdminProduct>(`/api/v1/admin/products/${product.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setProducts((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось изменить статус'); }
  };

  const remove = async (product: AdminProduct) => {
    if (!window.confirm(`Удалить объявление «${product.title}»?`)) return;
    try { await adminRequest(`/api/v1/admin/products/${product.id}`, { method: 'DELETE' }); setProducts((items) => items.filter((item) => item.id !== product.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось удалить товар'); }
  };

  const runMaintenance = async (scope: 'products' | 'profiles') => {
    const confirmation = scope === 'products' ? 'DELETE ALL PRODUCTS' : 'RESET ALL PROFILES';
    const typed = window.prompt(`Необратимое действие. Введи точно: ${confirmation}`);
    if (typed !== confirmation) return;
    setMaintenanceBusy(true); setError(''); setMessage('');
    try {
      const result = await adminRequest<MaintenanceResult>('/api/v1/admin/maintenance/reset', {
        method: 'POST',
        body: JSON.stringify({ scope, confirmation: typed }),
      });
      setMessage(`${result.message}. Удалено файлов: ${result.deleted_storage_objects}`);
      if (scope === 'profiles') {
        Object.keys(localStorage).filter((key) => key.startsWith('driply.')).forEach((key) => localStorage.removeItem(key));
        window.setTimeout(() => { window.location.href = '/'; }, 800);
      } else {
        await load();
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось выполнить очистку'); }
    finally { setMaintenanceBusy(false); }
  };

  return <main className="admin-shell">
    <header className="admin-header"><div><span>DRIPLY</span><h1>Админ-панель</h1>{access?.is_owner && <small>Главный администратор · @{access.username}</small>}</div><button onClick={load} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> Обновить</button></header>
    {error && <div className="admin-error">{error}</div>}{message && <div className="admin-success">{message}</div>}
    <section className="admin-stats"><article><Users /><b>{stats?.users ?? '—'}</b><span>Пользователей</span></article><article><Shield /><b>{stats?.products ?? '—'}</b><span>Объявлений</span></article><article><b>{stats?.active_products ?? '—'}</b><span>Активных</span></article><article><Flag /><b>{reports.filter((item) => item.status === 'pending').length}</b><span>Новых жалоб</span></article></section>
    <nav className="admin-tabs"><button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Объявления</button><button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Пользователи</button>{access?.is_owner && <button className={tab === 'admins' ? 'active' : ''} onClick={() => setTab('admins')}>Администраторы</button>}<button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Жалобы</button><button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>Отзывы</button>{access?.is_owner && <button className={tab === 'maintenance' ? 'active' : ''} onClick={() => setTab('maintenance')}>Обслуживание</button>}</nav>
    {tab === 'products' && <section className="admin-list">{products.map((product) => <article className="admin-card" key={product.id}><div><strong>{product.title}</strong><span>{product.brand} · @{product.seller_username}</span><b>{product.price} {product.currency}</b></div><select value={product.status} onChange={(event) => setStatus(product, event.target.value)}><option value="active">Активно</option><option value="reserved">Забронировано</option><option value="sold">Продано</option><option value="archived">Архив</option><option value="draft">Черновик</option></select><button className="danger" onClick={() => remove(product)}><Trash2 size={18} /></button></article>)}</section>}
    {tab === 'users' && <section className="admin-list">{users.map((user) => <article className="admin-card admin-user" key={user.id}><div><strong>{user.display_name}</strong><span>@{user.username}</span><small>{user.email || 'Без email'} · {user.city}, {user.country_code}</small></div>{user.is_admin ? <ShieldCheck size={20} /> : user.is_verified ? <Shield size={18} /> : null}</article>)}</section>}
    {tab === 'admins' && access?.is_owner && <section className="admin-admins"><form onSubmit={grantAdmin}><label>Выдать админку по @username<input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} placeholder="@username" required /></label><button type="submit"><UserPlus size={18} /> Выдать права</button></form><div className="admin-list">{users.filter((user) => user.is_admin).map((user) => <article className="admin-card admin-user" key={user.id}><div><strong>@{user.username}</strong><span>{user.is_owner ? 'Главный администратор' : 'Администратор'}</span></div>{!user.is_owner && <button className="danger-text" onClick={() => revokeAdmin(user)}>Снять права</button>}</article>)}</div></section>}
    {tab === 'reports' && <section className="admin-list">{reports.length ? reports.map((report) => <article className="admin-card" key={report.id}><div><strong>{reasonLabels[report.reason] || report.reason}: {report.product_title}</strong><span>@{report.seller_username} · от @{report.reporter_username}</span></div></article>) : <article className="admin-card"><strong>Жалоб пока нет</strong></article>}</section>}
    {tab === 'reviews' && <section className="admin-list">{reviews.length ? reviews.map((review) => <article className="admin-card" key={review.id}><div><strong>{review.author_display_name} · @{review.author_username}</strong><span>{'★'.repeat(review.rating)} · {review.comment || 'Без комментария'}</span></div><Star size={18} /></article>) : <article className="admin-card"><strong>Отзывов пока нет</strong></article>}</section>}
    {tab === 'maintenance' && access?.is_owner && <section className="admin-admins"><article className="admin-card"><div><strong><DatabaseZap size={18} /> Очистка тестовых данных</strong><span>Команды доступны только главному администратору и требуют точной контрольной фразы.</span></div></article><button className="danger-text" disabled={maintenanceBusy} onClick={() => runMaintenance('products')}>Удалить все товары и их фотографии</button><button className="danger-text" disabled={maintenanceBusy} onClick={() => runMaintenance('profiles')}>Удалить все профили и загруженные фотографии</button></section>}
    <a className="admin-back" href="/">Вернуться в DRIPLY</a>
  </main>;
}
