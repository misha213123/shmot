import { auth } from './auth';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

type CachedProduct = {
  id: string;
  seller_id: string;
  title: string;
  brand: string;
  status: string;
};

type Reservation = {
  id: string;
  product_id: string;
  product_title: string;
  buyer_id: string;
  buyer_username: string;
  buyer_display_name: string;
  seller_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
};

const labels: Record<Reservation['status'], string> = {
  pending: 'Ожидает ответа продавца',
  accepted: 'Бронь подтверждена',
  rejected: 'Продавец отклонил бронь',
  cancelled: 'Бронь отменена',
};

async function protectedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth.accessToken();
  if (!token) throw new Error('Сначала войдите в аккаунт');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    let message = 'Не удалось выполнить действие';
    try {
      const body = await response.json() as { detail?: string };
      if (body.detail) message = body.detail;
    } catch { /* ignore non-json */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function productsFromCache(): CachedProduct[] {
  const result: CachedProduct[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith('driply.api-cache.')) continue;
    try {
      const cache = JSON.parse(localStorage.getItem(key) || '{}') as { body?: string };
      const payload = JSON.parse(cache.body || '{}') as { items?: CachedProduct[] };
      if (Array.isArray(payload.items)) result.push(...payload.items);
    } catch { /* ignore stale cache entries */ }
  }
  return result;
}

async function currentProduct(): Promise<CachedProduct | null> {
  const title = document.querySelector<HTMLElement>('.detail-card .detail-title h1')?.innerText.trim();
  const brand = document.querySelector<HTMLElement>('.detail-card .detail-title b')?.innerText.trim();
  if (!title) return null;
  const cached = productsFromCache().find((item) => item.title === title && (!brand || item.brand === brand));
  if (cached) return cached;
  try {
    const response = await fetch(`${API_URL}/api/v1/products?status=active`);
    if (!response.ok) return null;
    const body = await response.json() as { items: CachedProduct[] };
    return body.items.find((item) => item.title === title && (!brand || item.brand === brand)) || null;
  } catch {
    return null;
  }
}

function statusElement(item: Reservation): HTMLElement {
  const status = document.createElement('div');
  status.className = `reservation-status reservation-${item.status}`;
  status.innerHTML = `<span></span><b>${labels[item.status]}</b>`;
  return status;
}

async function openChat(productId: string): Promise<void> {
  try {
    const conversation = await protectedRequest<{ id: string }>('/api/v1/me/chats', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
    await protectedRequest(`/api/v1/me/chats/${conversation.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: 'Хочу забронировать этот товар.' }),
    });
  } catch {
    // Reservation remains valid even if an automatic chat message cannot be sent.
  }
}

async function renderBuyer(card: HTMLElement, product: CachedProduct, userId: string): Promise<void> {
  const existing = await protectedRequest<Reservation[]>(`/api/v1/me/reservations?product_id=${product.id}`);
  const mine = existing.find((item) => item.buyer_id === userId);
  if (mine && mine.status !== 'cancelled') {
    card.append(statusElement(mine));
    if (mine.status === 'pending') {
      const cancel = document.createElement('button');
      cancel.className = 'reservation-secondary-button';
      cancel.textContent = 'Отменить бронь';
      cancel.onclick = async () => {
        cancel.disabled = true;
        try {
          await protectedRequest(`/api/v1/me/reservations/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'cancel' }) });
          document.querySelector('.reservation-status')?.remove();
          cancel.remove();
          injectReservationControls(true);
        } catch (error) {
          cancel.textContent = error instanceof Error ? error.message : 'Ошибка';
          cancel.disabled = false;
        }
      };
      card.append(cancel);
    }
    return;
  }

  if (product.status !== 'active') return;
  const button = document.createElement('button');
  button.className = 'reserve-product-button';
  button.innerHTML = '<span>◷</span><b>Забронировать товар</b>';
  button.onclick = async () => {
    button.disabled = true;
    button.classList.add('is-loading');
    button.querySelector('b')!.textContent = 'Отправляем заявку…';
    try {
      const reservation = await protectedRequest<Reservation>(`/api/v1/me/reservations/${product.id}`, { method: 'POST' });
      await openChat(product.id);
      button.replaceWith(statusElement(reservation));
    } catch (error) {
      button.querySelector('b')!.textContent = error instanceof Error ? error.message : 'Не удалось забронировать';
      button.classList.remove('is-loading');
      button.disabled = false;
    }
  };
  const contact = card.querySelector('.primary-button');
  contact ? contact.insertAdjacentElement('beforebegin', button) : card.append(button);
}

async function renderSeller(card: HTMLElement, product: CachedProduct): Promise<void> {
  const requests = (await protectedRequest<Reservation[]>(`/api/v1/me/reservations?product_id=${product.id}`))
    .filter((item) => item.status === 'pending');
  if (!requests.length) return;

  const panel = document.createElement('section');
  panel.className = 'reservation-requests';
  panel.innerHTML = `<header><b>Заявки на бронь</b><span>${requests.length}</span></header>`;
  requests.forEach((item) => {
    const row = document.createElement('article');
    row.innerHTML = `<div><strong>${item.buyer_display_name}</strong><small>@${item.buyer_username}</small></div><div class="reservation-actions"><button data-action="reject">Отклонить</button><button data-action="accept">Принять</button></div>`;
    row.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.onclick = async () => {
        row.classList.add('is-processing');
        try {
          await protectedRequest(`/api/v1/me/reservations/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ action: button.dataset.action }),
          });
          row.classList.add(button.dataset.action === 'accept' ? 'is-accepted' : 'is-rejected');
          window.setTimeout(() => row.remove(), 320);
          if (button.dataset.action === 'accept') {
            const badge = document.createElement('div');
            badge.className = 'reservation-confirmed-toast';
            badge.textContent = 'Товар забронирован';
            document.body.append(badge);
            window.setTimeout(() => badge.remove(), 2200);
          }
        } catch {
          row.classList.remove('is-processing');
        }
      };
    });
    panel.append(row);
  });
  card.append(panel);
}

let running = false;
async function injectReservationControls(force = false): Promise<void> {
  const card = document.querySelector<HTMLElement>('.detail-card');
  if (!card || running) return;
  if (!force && card.dataset.reservationsReady === 'true') return;
  card.dataset.reservationsReady = 'true';
  running = true;
  try {
    const [product, session] = await Promise.all([currentProduct(), auth.session()]);
    if (!product || !session?.user.id) return;
    const ownManagement = card.querySelector('.own-product-management');
    if (ownManagement || product.seller_id === session.user.id) await renderSeller(card, product);
    else await renderBuyer(card, product, session.user.id);
  } catch {
    card.dataset.reservationsReady = 'false';
  } finally {
    running = false;
  }
}

export function enableReservationDomSync(): void {
  const observer = new MutationObserver(() => void injectReservationControls());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  void injectReservationControls();
}
