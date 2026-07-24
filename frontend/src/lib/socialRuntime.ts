import { API_URL, type ApiNotification, type ApiProduct, type FollowState, type NotificationListResponse, type ProductListResponse } from './api';
import { auth } from './auth';

let lastSellerId = '';
let unreadCount = 0;
let refreshTimer = 0;
let enabled = false;
let inspectTimer = 0;
const pendingHeroes = new WeakSet<Element>();

async function protectedRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await auth.accessToken();
  if (!token) throw new Error('Сначала войдите в аккаунт');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(body.detail || `Ошибка ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function closePanel() {
  document.querySelector('.social-overlay')?.remove();
}

function panel(title: string) {
  closePanel();
  const overlay = document.createElement('div');
  overlay.className = 'social-overlay';
  overlay.innerHTML = `<section class="social-panel"><header><button class="social-close" aria-label="Закрыть">×</button><h2>${title}</h2><span></span></header><div class="social-content"><div class="social-loading">Загрузка…</div></div></section>`;
  overlay.querySelector('.social-close')?.addEventListener('click', closePanel);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closePanel(); });
  document.body.appendChild(overlay);
  return overlay.querySelector('.social-content') as HTMLElement;
}

function productCard(product: ApiProduct) {
  const card = document.createElement('article');
  card.className = 'social-product-card';
  const image = [...product.images].sort((a, b) => a.position - b.position)[0]?.url || '';
  card.innerHTML = `${image ? `<img src="${image}" alt="">` : '<div class="social-image-empty">DRIPLY</div>'}<div><b>${product.brand}</b><h3>${product.title}</h3><p>${product.city} · ${product.size || 'Размер не указан'}</p><strong>${Number(product.price).toLocaleString('ru-RU')} ${product.currency}</strong></div>`;
  card.addEventListener('click', () => {
    const detail = panel('Товар из подписок');
    detail.innerHTML = `${image ? `<img class="social-detail-image" src="${image}" alt="">` : ''}<div class="social-detail-copy"><span>${product.brand}</span><h2>${product.title}</h2><strong>${Number(product.price).toLocaleString('ru-RU')} ${product.currency}</strong><p>${product.description}</p><small>${product.delivery || 'Способ получения уточняется у продавца'}</small></div>`;
  });
  return card;
}

async function openFollowing() {
  const content = panel('Подписки');
  try {
    const result = await protectedRequest<ProductListResponse>('/api/v1/me/following/products');
    content.innerHTML = '';
    if (!result.items.length) {
      content.innerHTML = '<div class="social-empty"><b>Пока нет товаров</b><p>Подпишись на продавцов — их новые вещи появятся здесь.</p></div>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'social-products';
    result.items.forEach((item) => grid.appendChild(productCard(item)));
    content.appendChild(grid);
  } catch (error) {
    content.innerHTML = `<div class="social-error">${error instanceof Error ? error.message : 'Не удалось загрузить подписки'}</div>`;
  }
}

function notificationItem(item: ApiNotification) {
  const row = document.createElement('article');
  row.className = `social-notification ${item.is_read ? '' : 'unread'}`;
  row.innerHTML = `<span class="social-notification-dot"></span><div><b>${item.title}</b><p>${item.body}</p><small>${new Date(item.created_at).toLocaleString('ru-RU')}</small></div>`;
  return row;
}

async function loadNotifications(updateBadgeOnly = false) {
  try {
    const result = await protectedRequest<NotificationListResponse>('/api/v1/me/notifications');
    unreadCount = result.unread_count;
    updateBadge();
    if (updateBadgeOnly) return;
    const content = panel('Уведомления');
    content.innerHTML = '';
    if (!result.items.length) {
      content.innerHTML = '<div class="social-empty"><b>Уведомлений пока нет</b><p>Здесь появятся новые товары продавцов, на которых ты подписан.</p></div>';
    } else {
      const list = document.createElement('div');
      list.className = 'social-notifications';
      result.items.forEach((item) => list.appendChild(notificationItem(item)));
      content.appendChild(list);
      await protectedRequest<void>('/api/v1/me/notifications/read-all', { method: 'POST', body: '{}' });
      unreadCount = 0;
      updateBadge();
    }
  } catch {
    if (!updateBadgeOnly) {
      const content = panel('Уведомления');
      content.innerHTML = '<div class="social-error">Не удалось загрузить уведомления</div>';
    }
  }
}

function updateBadge() {
  const topbar = Array.from(document.querySelectorAll('.topbar')).find((node) => node.querySelector('.brand strong')?.textContent?.trim() === 'DRIPLY');
  const bell = topbar?.querySelector('button');
  if (!bell) return;

  let badge = bell.querySelector('.social-badge') as HTMLElement | null;
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'social-badge';
    bell.appendChild(badge);
  }

  const nextText = unreadCount > 99 ? '99+' : String(unreadCount);
  if (badge.textContent !== nextText) badge.textContent = nextText;
  const shouldHide = unreadCount === 0;
  if (badge.hidden !== shouldHide) badge.hidden = shouldHide;
}

async function addFollowButton(hero: Element) {
  if (!lastSellerId || hero.querySelector('.seller-follow-button') || pendingHeroes.has(hero)) return;
  pendingHeroes.add(hero);
  try {
    let state = await protectedRequest<FollowState>(`/api/v1/me/following/${lastSellerId}`);
    if (!hero.isConnected || hero.querySelector('.seller-follow-button')) return;
    const button = document.createElement('button');
    button.className = `seller-follow-button ${state.following ? 'following' : ''}`;
    const render = () => {
      const nextText = state.following ? `Вы подписаны · ${state.followers_count}` : `Подписаться · ${state.followers_count}`;
      if (button.textContent !== nextText) button.textContent = nextText;
      button.classList.toggle('following', state.following);
    };
    render();
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        state = await protectedRequest<FollowState>(`/api/v1/me/following/${lastSellerId}`, { method: state.following ? 'DELETE' : 'POST', body: '{}' });
        render();
      } finally { button.disabled = false; }
    });
    const contact = hero.querySelector('.seller-contact');
    contact?.before(button);
  } catch {
    // Public seller profile remains usable if social API is unavailable.
  } finally {
    pendingHeroes.delete(hero);
  }
}

function inspectDom() {
  document.querySelectorAll('.seller-profile-hero').forEach((hero) => { void addFollowButton(hero); });
  updateBadge();
}

function scheduleInspect() {
  window.clearTimeout(inspectTimer);
  inspectTimer = window.setTimeout(inspectDom, 80);
}

function installFetchObserver() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0]);
    const match = url.match(/\/api\/v1\/profiles\/([0-9a-f-]{36})(?:\?|$)/i);
    if (match) {
      lastSellerId = match[1];
      scheduleInspect();
    }
    return response;
  };
}

export function enableSocialRuntime() {
  if (enabled) return;
  enabled = true;

  installFetchObserver();
  const root = document.querySelector('.app-shell') || document.getElementById('root') || document.body;
  const observer = new MutationObserver(scheduleInspect);
  observer.observe(root, { subtree: true, childList: true });

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button');
    if (!button) return;

    if (button.closest('.feed-tabs') && button.textContent?.trim() === 'Подписки') {
      event.preventDefault();
      openFollowing();
      return;
    }

    const topbar = button.closest('.topbar');
    const title = topbar?.querySelector('.brand strong')?.textContent?.trim();
    const firstButton = topbar?.querySelector('button');
    if (title === 'DRIPLY' && firstButton === button) {
      event.preventDefault();
      loadNotifications(false);
    }
  }, true);

  scheduleInspect();
  window.setTimeout(() => { void loadNotifications(true); }, 1200);
  refreshTimer = window.setInterval(() => { void loadNotifications(true); }, 30000);
  window.addEventListener('beforeunload', () => {
    observer.disconnect();
    window.clearInterval(refreshTimer);
    window.clearTimeout(inspectTimer);
  }, { once: true });
}
