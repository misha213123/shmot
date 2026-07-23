import { auth } from './auth';
import { API_URL } from './api';
import '../styles/chat.css';

type CachedProduct = {
  id: string;
  title: string;
  seller_id: string;
};

type Conversation = {
  id: string;
  product_id: string;
  product_title: string;
  product_image: string | null;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  other_avatar_url: string | null;
  last_message: string | null;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

const products = new Map<string, CachedProduct>();
let activeProductId = '';
let enabled = false;
let pollTimer: number | null = null;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await auth.accessToken();
  if (!token) throw new Error('Сначала войдите в аккаунт');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(body.detail || 'Не удалось выполнить действие');
  }
  return response.json() as Promise<T>;
}

function closeOverlay(): void {
  if (pollTimer) window.clearInterval(pollTimer);
  pollTimer = null;
  document.querySelector('.chat-backdrop')?.remove();
  document.body.classList.remove('chat-open');
}

function iconLetter(name: string): string {
  return (name || 'U').trim().slice(0, 1).toUpperCase();
}

function createShell(title: string): { backdrop: HTMLDivElement; panel: HTMLElement; body: HTMLElement } {
  closeOverlay();
  const backdrop = document.createElement('div');
  backdrop.className = 'chat-backdrop';
  const panel = document.createElement('section');
  panel.className = 'chat-panel';
  const header = document.createElement('header');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'chat-close';
  close.textContent = '×';
  close.addEventListener('click', closeOverlay);
  const heading = document.createElement('strong');
  heading.textContent = title;
  const spacer = document.createElement('span');
  header.append(close, heading, spacer);
  const body = document.createElement('main');
  body.className = 'chat-body';
  panel.append(header, body);
  backdrop.append(panel);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeOverlay(); });
  document.body.append(backdrop);
  document.body.classList.add('chat-open');
  return { backdrop, panel, body };
}

function showLoading(body: HTMLElement, text = 'Загружаем сообщения…'): void {
  body.replaceChildren();
  const node = document.createElement('div');
  node.className = 'chat-loading';
  node.innerHTML = '<span></span>';
  const label = document.createElement('b');
  label.textContent = text;
  node.append(label);
  body.append(node);
}

function showError(body: HTMLElement, message: string): void {
  body.replaceChildren();
  const node = document.createElement('div');
  node.className = 'chat-empty';
  const title = document.createElement('b');
  title.textContent = message;
  node.append(title);
  body.append(node);
}

async function openConversationList(): Promise<void> {
  const { body } = createShell('Сообщения');
  showLoading(body, 'Открываем диалоги…');
  try {
    const conversations = await request<Conversation[]>('/api/v1/me/chats');
    body.replaceChildren();
    const list = document.createElement('div');
    list.className = 'conversation-list';
    if (!conversations.length) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.innerHTML = '<div>💬</div><b>Сообщений пока нет</b><p>Открой товар и нажми «Связаться с продавцом».</p>';
      body.append(empty);
      return;
    }
    conversations.forEach((conversation, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'conversation-row';
      button.style.setProperty('--delay', `${index * 45}ms`);
      const avatar = conversation.other_avatar_url ? document.createElement('img') : document.createElement('span');
      if (avatar instanceof HTMLImageElement) {
        avatar.src = conversation.other_avatar_url || '';
        avatar.alt = conversation.other_display_name;
      } else {
        avatar.textContent = iconLetter(conversation.other_display_name || conversation.other_username);
      }
      avatar.className = 'conversation-avatar';
      const copy = document.createElement('span');
      copy.className = 'conversation-copy';
      const name = document.createElement('b');
      name.textContent = conversation.other_display_name || `@${conversation.other_username}`;
      const product = document.createElement('small');
      product.textContent = conversation.product_title;
      const preview = document.createElement('em');
      preview.textContent = conversation.last_message || 'Начните диалог';
      copy.append(name, product, preview);
      if (conversation.product_image) {
        const image = document.createElement('img');
        image.className = 'conversation-product';
        image.src = conversation.product_image;
        image.alt = conversation.product_title;
        button.append(avatar, copy, image);
      } else button.append(avatar, copy);
      button.addEventListener('click', () => openChat(conversation));
      list.append(button);
    });
    body.append(list);
  } catch (error) {
    showError(body, error instanceof Error ? error.message : 'Не удалось открыть сообщения');
  }
}

async function openChat(conversation: Conversation): Promise<void> {
  const { panel, body } = createShell(conversation.other_display_name || `@${conversation.other_username}`);
  panel.classList.add('chat-dialog-panel');
  const productBar = document.createElement('div');
  productBar.className = 'chat-product-bar';
  if (conversation.product_image) {
    const image = document.createElement('img');
    image.src = conversation.product_image;
    image.alt = conversation.product_title;
    productBar.append(image);
  }
  const productCopy = document.createElement('span');
  productCopy.innerHTML = '<small>Объявление</small>';
  const productTitle = document.createElement('b');
  productTitle.textContent = conversation.product_title;
  productCopy.append(productTitle);
  productBar.append(productCopy);
  panel.insertBefore(productBar, body);

  const messages = document.createElement('div');
  messages.className = 'message-list';
  const composer = document.createElement('form');
  composer.className = 'chat-composer';
  const input = document.createElement('textarea');
  input.rows = 1;
  input.maxLength = 2000;
  input.placeholder = 'Написать сообщение…';
  const send = document.createElement('button');
  send.type = 'submit';
  send.textContent = '➤';
  composer.append(input, send);
  body.replaceChildren(messages, composer);

  const session = await auth.session();
  const ownId = session?.user.id || '';
  let previousSignature = '';

  const load = async (animate = false) => {
    try {
      const items = await request<ChatMessage[]>(`/api/v1/me/chats/${conversation.id}/messages`);
      const signature = items.map((item) => item.id).join(':');
      if (signature === previousSignature) return;
      previousSignature = signature;
      messages.replaceChildren();
      if (!items.length) {
        const hint = document.createElement('div');
        hint.className = 'message-hint';
        hint.textContent = 'Поздоровайся и уточни детали товара';
        messages.append(hint);
      }
      items.forEach((item, index) => {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${item.sender_id === ownId ? 'mine' : 'theirs'}${animate && index === items.length - 1 ? ' new' : ''}`;
        const text = document.createElement('p');
        text.textContent = item.text;
        const time = document.createElement('small');
        time.textContent = new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        bubble.append(text, time);
        messages.append(bubble);
      });
      messages.scrollTop = messages.scrollHeight;
    } catch { /* keep the current chat visible during temporary network issues */ }
  };

  composer.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    input.disabled = true;
    try {
      await request<ChatMessage>(`/api/v1/me/chats/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
      input.value = '';
      await load(true);
    } catch (error) {
      input.value = text;
      window.alert(error instanceof Error ? error.message : 'Не удалось отправить сообщение');
    } finally {
      send.disabled = false;
      input.disabled = false;
      input.focus();
    }
  });

  await load();
  pollTimer = window.setInterval(() => load(), 4000);
}

async function startConversation(): Promise<void> {
  if (!activeProductId) {
    window.alert('Сначала открой конкретный товар');
    return;
  }
  const cached = products.get(activeProductId);
  const session = await auth.session();
  if (cached?.seller_id === session?.user.id) {
    window.alert('Это твоё объявление');
    return;
  }
  const { body } = createShell('Сообщения');
  showLoading(body, 'Создаём диалог…');
  try {
    const conversation = await request<Conversation>('/api/v1/me/chats', {
      method: 'POST',
      body: JSON.stringify({ product_id: activeProductId }),
    });
    await openChat(conversation);
  } catch (error) {
    showError(body, error instanceof Error ? error.message : 'Не удалось начать диалог');
  }
}

function patchFetch(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const viewMatch = url.match(/\/api\/v1\/products\/([0-9a-f-]+)\/view/);
    if (viewMatch) activeProductId = viewMatch[1];
    const response = await originalFetch(input, init);
    if (response.ok && /\/api\/v1\/(?:me\/)?products(?:\?|$)/.test(url)) {
      response.clone().json().then((body: { items?: CachedProduct[] }) => {
        body.items?.forEach((item) => products.set(item.id, item));
      }).catch(() => undefined);
    }
    return response;
  };
}

function handleClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest('button');
  if (!button) return;
  const text = button.textContent?.trim() || '';
  if (/связаться с продавцом/i.test(text)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    startConversation();
    return;
  }
  const topbar = button.closest('.topbar');
  const brand = topbar?.querySelector('.brand strong')?.textContent?.trim();
  if (topbar && brand === 'DRIPLY' && button === topbar.querySelector('button:first-child')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openConversationList();
  }
}

export function enableChatRuntime(): void {
  if (enabled) return;
  enabled = true;
  patchFetch();
  document.addEventListener('click', handleClick, true);
}
