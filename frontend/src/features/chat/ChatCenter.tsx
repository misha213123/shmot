import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Send, X } from 'lucide-react';

import { auth } from '../../lib/auth';
import { API_URL } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import './chat-center.css';

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
  conversation_id?: string;
  sender_id: string;
  text: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
};

type OpenChatDetail = { productId?: string; conversationId?: string };

type View = 'closed' | 'list' | 'dialog';

const CONVERSATIONS_CACHE = 'driply.chat.conversations.v1';
const messagesCacheKey = (conversationId: string) => `driply.chat.messages.v1.${conversationId}`;

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeCache<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await auth.accessToken();
  if (!token) throw new Error('Сессия истекла. Войди снова.');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: 'no-store',
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
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (current.some((item) => item.id === incoming.id)) return current;
  const withoutMatchingPending = current.filter((item) => !(item.pending && item.sender_id === incoming.sender_id && item.text === incoming.text));
  return [...withoutMatchingPending, incoming].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function avatarLetter(name: string): string {
  return (name || 'U').trim().slice(0, 1).toUpperCase();
}

export default function ChatCenter() {
  const [view, setView] = useState<View>('closed');
  const [conversations, setConversations] = useState<Conversation[]>(() => readCache(CONVERSATIONS_CACHE, []));
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ownId, setOwnId] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<Conversation | null>(null);
  const typingTimer = useRef<number | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    auth.session().then((session) => setOwnId(session?.user.id || '')).catch(() => undefined);
  }, []);

  const refreshConversations = useCallback(async (silent = false) => {
    if (!silent && conversations.length === 0) setLoadingList(true);
    try {
      const items = await request<Conversation[]>('/api/v1/me/chats');
      setConversations(items);
      writeCache(CONVERSATIONS_CACHE, items);
      setError('');
      return items;
    } catch (reason) {
      if (!silent) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить диалоги');
      return conversations;
    } finally {
      setLoadingList(false);
    }
  }, [conversations]);

  const openConversation = useCallback(async (conversation: Conversation) => {
    setActive(conversation);
    setView('dialog');
    setError('');
    const cached = readCache<ChatMessage[]>(messagesCacheKey(conversation.id), []);
    setMessages(cached);
    setLoadingMessages(cached.length === 0);
    try {
      const items = await request<ChatMessage[]>(`/api/v1/me/chats/${conversation.id}/messages`);
      setMessages(items);
      writeCache(messagesCacheKey(conversation.id), items);
    } catch (reason) {
      if (cached.length === 0) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить сообщения');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openList = useCallback(() => {
    setView('list');
    setActive(null);
    setError('');
    void refreshConversations();
  }, [refreshConversations]);

  const startByProduct = useCallback(async (productId: string) => {
    if (!productId) return;
    setView('list');
    setLoadingList(true);
    setError('');
    try {
      const conversation = await request<Conversation>('/api/v1/me/chats', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
      });
      setConversations((current) => {
        const next = [conversation, ...current.filter((item) => item.id !== conversation.id)];
        writeCache(CONVERSATIONS_CACHE, next);
        return next;
      });
      await openConversation(conversation);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось начать диалог');
    } finally {
      setLoadingList(false);
    }
  }, [openConversation]);

  useEffect(() => {
    const onOpenMessages = () => openList();
    const onOpenChat = (event: Event) => {
      const detail = (event as CustomEvent<OpenChatDetail>).detail || {};
      if (detail.productId) void startByProduct(detail.productId);
      else if (detail.conversationId) {
        const conversation = conversations.find((item) => item.id === detail.conversationId);
        if (conversation) void openConversation(conversation);
        else void refreshConversations().then((items) => {
          const found = items.find((item) => item.id === detail.conversationId);
          if (found) void openConversation(found);
        });
      } else openList();
    };
    window.addEventListener('driply:open-messages', onOpenMessages);
    window.addEventListener('driply:open-chat', onOpenChat);
    window.addEventListener('driply:start-chat', onOpenChat);
    return () => {
      window.removeEventListener('driply:open-messages', onOpenMessages);
      window.removeEventListener('driply:open-chat', onOpenChat);
      window.removeEventListener('driply:start-chat', onOpenChat);
    };
  }, [conversations, openConversation, openList, refreshConversations, startByProduct]);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest('button');
      if (!button) return;
      const label = button.textContent?.trim() || '';
      if (!/связаться с продавцом|написать продавцу/i.test(label)) return;
      const productId = sessionStorage.getItem('driply.active-product-id') || '';
      if (!productId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void startByProduct(productId);
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, [startByProduct]);

  useEffect(() => {
    const rememberProduct = (event: Event) => {
      const productId = (event as CustomEvent<{ productId?: string }>).detail?.productId;
      if (productId) sessionStorage.setItem('driply.active-product-id', productId);
    };
    window.addEventListener('driply:product-opened', rememberProduct);
    return () => window.removeEventListener('driply:product-opened', rememberProduct);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('driply-chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const incoming = payload.new as ChatMessage;
        const current = activeRef.current;
        if (current && incoming.conversation_id === current.id) {
          setMessages((items) => {
            const next = mergeMessages(items, incoming);
            writeCache(messagesCacheKey(current.id), next);
            return next;
          });
        }
        void refreshConversations(true);
        window.dispatchEvent(new CustomEvent('driply:notifications-refresh'));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refreshConversations]);

  useEffect(() => {
    if (!active || !ownId) return;
    const channel = supabase.channel(`conversation-presence:${active.id}`, {
      config: { presence: { key: ownId }, broadcast: { self: true } },
    });
    presenceChannelRef.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Record<string, unknown>>();
        const partner = Object.entries(state).some(([key, entries]) => key === active.other_user_id && entries.length > 0);
        setOnline(partner);
        if (partner) setLastSeen(null);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === active.other_user_id) {
          setOnline(false);
          setLastSeen(new Date().toISOString());
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId !== active.other_user_id) return;
        setTyping(Boolean(payload.typing));
        if (typingTimer.current) window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(() => setTyping(false), 2200);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ userId: ownId, onlineAt: new Date().toISOString() });
      });
    return () => {
      presenceChannelRef.current = null;
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      void supabase.removeChannel(channel);
      setOnline(false);
      setTyping(false);
    };
  }, [active, ownId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: messages.some((item) => item.pending) ? 'smooth' : 'auto' });
  }, [messages]);

  const statusText = useMemo(() => {
    if (typing) return 'печатает…';
    if (online) return 'в сети';
    if (lastSeen) return `был(а) ${new Date(lastSeen).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    return active ? `@${active.other_username}` : '';
  }, [active, lastSeen, online, typing]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!active || sending) return;
    const value = text.trim();
    if (!value) return;
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      conversation_id: active.id,
      sender_id: ownId,
      text: value,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setText('');
    setSending(true);
    setMessages((items) => {
      const next = [...items, optimistic];
      writeCache(messagesCacheKey(active.id), next);
      return next;
    });
    try {
      const saved = await request<ChatMessage>(`/api/v1/me/chats/${active.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      });
      setMessages((items) => {
        const next = mergeMessages(items.filter((item) => item.id !== optimistic.id), { ...saved, conversation_id: active.id });
        writeCache(messagesCacheKey(active.id), next);
        return next;
      });
      setConversations((items) => {
        const next = items.map((item) => item.id === active.id ? { ...item, last_message: value, updated_at: saved.created_at } : item)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        writeCache(CONVERSATIONS_CACHE, next);
        return next;
      });
      window.dispatchEvent(new CustomEvent('driply:notifications-refresh'));
    } catch (reason) {
      setMessages((items) => items.map((item) => item.id === optimistic.id ? { ...item, pending: false, failed: true } : item));
      setError(reason instanceof Error ? reason.message : 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const broadcastTyping = (value: string) => {
    setText(value);
    const channel = presenceChannelRef.current;
    if (!channel || !ownId) return;
    void channel.send({ type: 'broadcast', event: 'typing', payload: { userId: ownId, typing: value.trim().length > 0 } });
  };

  if (view === 'closed') return null;

  return (
    <div className="react-chat-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setView('closed'); }}>
      <section className="react-chat-panel" role="dialog" aria-modal="true" aria-label="Сообщения">
        <header className="react-chat-header">
          {view === 'dialog' ? (
            <button type="button" className="react-chat-icon" onClick={() => { setView('list'); setActive(null); void refreshConversations(true); }} aria-label="Назад"><ArrowLeft /></button>
          ) : <span />}
          <div>
            <strong>{view === 'dialog' && active ? active.other_display_name || `@${active.other_username}` : 'Сообщения'}</strong>
            {view === 'dialog' && <small className={online || typing ? 'is-online' : ''}>{statusText}</small>}
          </div>
          <button type="button" className="react-chat-icon" onClick={() => setView('closed')} aria-label="Закрыть"><X /></button>
        </header>

        {view === 'list' ? (
          <main className="react-conversation-list">
            {loadingList && conversations.length === 0 && <div className="react-chat-state"><span className="react-chat-spinner" /><b>Открываем диалоги…</b></div>}
            {!loadingList && conversations.length === 0 && !error && <div className="react-chat-state"><MessageCircle size={48} /><b>Сообщений пока нет</b><p>Открой товар и напиши продавцу.</p></div>}
            {conversations.map((conversation) => (
              <button type="button" className="react-conversation-row" key={conversation.id} onClick={() => void openConversation(conversation)}>
                {conversation.other_avatar_url ? <img className="react-chat-avatar" src={conversation.other_avatar_url} alt="" /> : <span className="react-chat-avatar fallback">{avatarLetter(conversation.other_display_name || conversation.other_username)}</span>}
                <span className="react-conversation-copy"><b>{conversation.other_display_name || `@${conversation.other_username}`}</b><small>{conversation.product_title}</small><em>{conversation.last_message || 'Начните диалог'}</em></span>
                {conversation.product_image && <img className="react-chat-product-thumb" src={conversation.product_image} alt="" />}
              </button>
            ))}
          </main>
        ) : active ? (
          <main className="react-dialog-body">
            <button type="button" className="react-chat-product-bar" onClick={() => window.dispatchEvent(new CustomEvent('driply:open-product', { detail: { productId: active.product_id } }))}>
              {active.product_image && <img src={active.product_image} alt="" />}
              <span><small>Объявление</small><b>{active.product_title}</b></span>
            </button>
            <div className="react-message-list" ref={listRef}>
              {loadingMessages && messages.length === 0 && <div className="react-chat-state compact"><span className="react-chat-spinner" /><b>Загружаем сообщения…</b></div>}
              {!loadingMessages && messages.length === 0 && <div className="react-message-hint">Поздоровайся и уточни детали товара</div>}
              {messages.map((message) => (
                <div key={message.id} className={`react-message ${message.sender_id === ownId ? 'mine' : 'theirs'} ${message.pending ? 'pending' : ''} ${message.failed ? 'failed' : ''}`}>
                  <p>{message.text}</p><small>{message.failed ? 'не отправлено' : message.pending ? 'отправляем…' : new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              ))}
            </div>
            <form className="react-chat-composer" onSubmit={sendMessage}>
              <textarea value={text} onChange={(event) => broadcastTyping(event.target.value)} rows={1} maxLength={2000} placeholder="Написать сообщение…" />
              <button type="submit" disabled={!text.trim() || sending} aria-label="Отправить"><Send /></button>
            </form>
          </main>
        ) : null}
        {error && <div className="react-chat-error">{error}</div>}
      </section>
    </div>
  );
}
