import { api, type ApiNotification } from './api';
import '../styles/notifications-center.css';

let enabled = false;
let pollTimer: number | null = null;
let unreadCount = 0;

function closeCenter(): void {
  document.querySelector('.notification-center-backdrop')?.remove();
  document.documentElement.classList.remove('notification-center-open');
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function iconFor(type: string): string {
  if (/message|chat|system/i.test(type)) return '💬';
  if (/offer|price/i.test(type)) return '₽';
  if (/favorite|like/i.test(type)) return '♡';
  if (/deal|reservation/i.test(type)) return '↔';
  return '•';
}

function updateBadges(): void {
  document.querySelectorAll<HTMLButtonElement>('button[aria-label="Уведомления"]').forEach((button) => {
    button.classList.add('notification-bell-button');
    let badge = button.querySelector<HTMLElement>('.notification-unread-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notification-unread-badge';
      button.append(badge);
    }
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    badge.hidden = unreadCount === 0;
  });
}

async function refreshBadge(): Promise<void> {
  try {
    const result = await api.notifications();
    unreadCount = result.unread_count;
    updateBadges();
  } catch {
    // Keep the current badge during temporary network errors.
  }
}

function renderItems(container: HTMLElement, items: ApiNotification[]): void {
  container.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'notification-empty';
    empty.innerHTML = '<span>✓</span><b>Пока всё спокойно</b><p>Новые сообщения, предложения цены и сделки появятся здесь.</p>';
    container.append(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = `notification-card${item.is_read ? '' : ' unread'}`;
    const icon = document.createElement('span');
    icon.className = 'notification-card-icon';
    icon.textContent = iconFor(item.type);
    const copy = document.createElement('div');
    const title = document.createElement('b');
    title.textContent = item.title;
    const body = document.createElement('p');
    body.textContent = item.body;
    const time = document.createElement('small');
    time.textContent = formatTime(item.created_at);
    copy.append(title, body, time);
    card.append(icon, copy);
    container.append(card);
  });
}

async function openCenter(): Promise<void> {
  closeCenter();
  const backdrop = document.createElement('div');
  backdrop.className = 'notification-center-backdrop';
  backdrop.innerHTML = `<section class="notification-center-panel">
    <header><button type="button" class="notification-center-close" aria-label="Закрыть">×</button><strong>Уведомления</strong><span></span></header>
    <main class="notification-center-body"><div class="notification-loading"><span></span><b>Загружаем…</b></div></main>
  </section>`;
  document.body.append(backdrop);
  document.documentElement.classList.add('notification-center-open');

  const close = backdrop.querySelector<HTMLButtonElement>('.notification-center-close');
  close?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeCenter();
  });
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeCenter(); });

  const body = backdrop.querySelector<HTMLElement>('.notification-center-body');
  if (!body) return;
  try {
    const result = await api.notifications();
    renderItems(body, result.items);
    if (result.unread_count > 0) {
      await api.readAllNotifications();
      unreadCount = 0;
      updateBadges();
    }
  } catch (error) {
    body.innerHTML = `<div class="notification-empty"><span>!</span><b>Не удалось загрузить уведомления</b><p>${error instanceof Error ? error.message : 'Попробуй ещё раз.'}</p></div>`;
  }
}

function handleClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[aria-label="Уведомления"]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void openCenter();
}

export function enableNotificationRuntime(): void {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  document.addEventListener('click', handleClick, true);
  window.addEventListener('driply:open-notifications', () => void openCenter());
  window.addEventListener('driply:notifications-refresh', () => void refreshBadge());
  window.addEventListener('focus', () => void refreshBadge());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshBadge();
  });
  const observer = new MutationObserver(updateBadges);
  observer.observe(document.body, { childList: true, subtree: true });
  void refreshBadge();
  pollTimer = window.setInterval(() => void refreshBadge(), 5000);
  window.addEventListener('beforeunload', () => { if (pollTimer) window.clearInterval(pollTimer); }, { once: true });
}
