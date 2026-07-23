import { useEffect, useState } from 'react';
import { Flag, RefreshCw, Shield, Trash2, Users } from 'lucide-react';

import { API_URL } from '../lib/api';
import { auth } from '../lib/auth';
import '../styles/admin.css';


type Stats = { users: number; products: number; active_products: number; sold_products: number };
type AdminUser = { id: string; email: string | null; username: string; display_name: string; country_code: string; city: string; is_verified: boolean };
type AdminProduct = { id: string; title: string; brand: string; status: string; price: string; currency: string; seller_id: string; seller_username: string };
type AdminReport = { id: string; product_id: string; product_title: string; seller_username: string; reporter_username: string; reason: string; details: string | null; status: string; moderator_note: string | null; created_at: string };

type Tab = 'products' | 'users' | 'reports';

const reasonLabels: Record<string, string> = {
  fake: 'Подделка', prohibited: 'Запрещённый товар', spam: 'Спам', fraud: 'Мошенничество', wrong_info: 'Неверное описание', other: 'Другое',
};

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
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [tab, setTab] = useState<Tab>('products');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [nextStats, nextUsers, nextProducts, nextReports] = await Promise.all([
        adminRequest<Stats>('/api/v1/admin/stats'),
        adminRequest<AdminUser[]>('/api/v1/admin/users'),
        adminRequest<AdminProduct[]>('/api/v1/admin/products'),
        adminRequest<AdminReport[]>('/api/v1/admin/reports'),
      ]);
      setStats(nextStats); setUsers(nextUsers); setProducts(nextProducts); setReports(nextReports);
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

  const decideReport = async (report: AdminReport, archiveProduct: boolean) => {
    try {
      const updated = await adminRequest<AdminReport>(`/api/v1/admin/reports/${report.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: archiveProduct ? 'action_taken' : 'rejected', archive_product: archiveProduct }),
      });
      setReports((items) => items.map((item) => item.id === updated.id ? updated : item));
      if (archiveProduct) setProducts((items) => items.map((item) => item.id === report.product_id ? { ...item, status: 'archived' } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось обработать жалобу'); }
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
      <article><Flag /><b>{reports.filter((item) => item.status === 'pending').length}</b><span>Новых жалоб</span></article>
    </section>

    <nav className="admin-tabs">
      <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Объявления</button>
      <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Пользователи</button>
      <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Жалобы {reports.filter((item) => item.status === 'pending').length || ''}</button>
    </nav>

    {tab === 'products' && <section className="admin-list">
      {products.map((product) => <article className="admin-card" key={product.id}>
        <div><strong>{product.title}</strong><span>{product.brand} · @{product.seller_username}</span><b>{product.price} {product.currency}</b></div>
        <select value={product.status} onChange={(event) => setStatus(product, event.target.value)}>
          <option value="active">Активно</option><option value="reserved">Забронировано</option><option value="sold">Продано</option><option value="archived">Архив</option><option value="draft">Черновик</option>
        </select>
        <button className="danger" onClick={() => remove(product)}><Trash2 size={18} /></button>
      </article>)}
    </section>}

    {tab === 'users' && <section className="admin-list">
      {users.map((user) => <article className="admin-card admin-user" key={user.id}>
        <div><strong>{user.display_name}</strong><span>@{user.username}</span><small>{user.email || 'Без email'} · {user.city}, {user.country_code}</small></div>
        {user.is_verified && <Shield size={18} />}
      </article>)}
    </section>}

    {tab === 'reports' && <section className="admin-list">
      {reports.length ? reports.map((report) => <article className="admin-card admin-report" key={report.id}>
        <div>
          <span className={`admin-report-status ${report.status}`}>{report.status === 'pending' ? 'Новая' : report.status === 'action_taken' ? 'Приняты меры' : 'Закрыта'}</span>
          <strong>{reasonLabels[report.reason] || report.reason}: {report.product_title}</strong>
          <span>Продавец @{report.seller_username} · жалоба от @{report.reporter_username}</span>
          {report.details && <small>{report.details}</small>}
        </div>
        {report.status === 'pending' && <div className="admin-report-actions">
          <button className="dismiss" onClick={() => decideReport(report, false)}>Отклонить</button>
          <button className="approve" onClick={() => decideReport(report, true)}>Скрыть товар</button>
        </div>}
      </article>) : <div className="admin-card"><strong>Жалоб пока нет</strong></div>}
    </section>}

    <a className="admin-back" href="/">Вернуться в DRIPLY</a>
  </main>;
}
