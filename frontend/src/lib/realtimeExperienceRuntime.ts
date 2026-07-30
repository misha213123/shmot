import { auth } from './auth';
import { supabase } from './supabase';

type ConversationSummary = {
  id: string;
  other_user_id: string;
  other_display_name: string;
  other_username: string;
};

type RealtimeMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

type PresenceState = { user_id: string; online_at: string };

let enabled = false;
let ownUserId = '';
let activeConversationId = '';
const conversations = new Map<string, ConversationSummary>();
const onlineUsers = new Set<string>();
const lastSeen = new Map<string, number>();

function statusNode(): HTMLElement | null {
  const header = document.querySelector<HTMLElement>('.chat-dialog-panel > header');
  if (!header) return null;
  let node = header.querySelector<HTMLElement>('.chat-presence-status');
  if (!node) {
    node = document.createElement('small');
    node.className = 'chat-presence-status';
    header.querySelector('strong')?.insertAdjacentElement('afterend', node);
  }
  return node;
}

function updatePresenceLabel(): void {
  const conversation = conversations.get(activeConversationId);
  const node = statusNode();
  if (!conversation || !node) return;
  const otherId = conversation.other_user_id;
  if (onlineUsers.has(otherId)) {
    node.textContent = 'в сети';
    node.classList.add('online');
    return;
  }
  node.classList.remove('online');
  const seen = lastSeen.get(otherId);
  if (!seen) { node.textContent = 'не в сети'; return; }
  node.textContent = `был(а) ${new Date(seen).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

function appendMessage(message: RealtimeMessage): void {
  if (message.conversation_id !== activeConversationId) return;
  const list = document.querySelector<HTMLElement>('.chat-dialog-panel .message-list');
  if (!list || list.querySelector(`[data-message-id="${message.id}"]`)) return;
  list.querySelector('.message-hint')?.remove();
  const bubble = document.createElement('div');
  bubble.dataset.messageId = message.id;
  bubble.className = `message-bubble ${message.sender_id === ownUserId ? 'mine' : 'theirs'} new`;
  const text = document.createElement('p');
  text.textContent = message.text;
  const time = document.createElement('small');
  time.textContent = new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  bubble.append(text, time);
  list.append(bubble);
  list.scrollTop = list.scrollHeight;
}

function installStyles(): void {
  if (document.getElementById('driply-realtime-styles')) return;
  const style = document.createElement('style');
  style.id = 'driply-realtime-styles';
  style.textContent = `
    .chat-dialog-panel>header{position:relative}
    .chat-presence-status{position:absolute;left:50%;top:58%;transform:translateX(-50%);font-size:11px;color:#888;font-weight:700;white-space:nowrap}
    .chat-presence-status.online{color:#20a05a}
  `;
  document.head.append(style);
}

function patchFetch(): void {
  const marker = window as Window & { __driplyRealtimeFetch?: boolean };
  if (marker.__driplyRealtimeFetch) return;
  marker.__driplyRealtimeFetch = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const response = await nativeFetch(input, init);
    const conversationMatch = url.match(/\/api\/v1\/me\/chats\/([0-9a-f-]+)\/messages/);
    if (conversationMatch) {
      activeConversationId = conversationMatch[1];
      queueMicrotask(updatePresenceLabel);
    }
    if (response.ok && /\/api\/v1\/me\/chats(?:\?|$)/.test(url) && (!init?.method || init.method.toUpperCase() === 'GET')) {
      response.clone().json().then((items: ConversationSummary[]) => {
        items.forEach((item) => conversations.set(item.id, item));
        updatePresenceLabel();
      }).catch(() => undefined);
    }
    if (response.ok && /\/api\/v1\/me\/chats$/.test(url) && init?.method?.toUpperCase() === 'POST') {
      response.clone().json().then((item: ConversationSummary) => {
        conversations.set(item.id, item);
        activeConversationId = item.id;
        updatePresenceLabel();
      }).catch(() => undefined);
    }
    return response;
  };
}

async function startRealtime(): Promise<void> {
  const session = await auth.session();
  if (!session) return;
  ownUserId = session.user.id;

  const presence = supabase.channel('driply-online-users', { config: { presence: { key: ownUserId } } });
  presence
    .on('presence', { event: 'sync' }, () => {
      onlineUsers.clear();
      const state = presence.presenceState<PresenceState>();
      Object.values(state).flat().forEach((entry) => {
        if (entry.user_id) {
          onlineUsers.add(entry.user_id);
          lastSeen.set(entry.user_id, Date.now());
        }
      });
      updatePresenceLabel();
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach((entry) => {
        const value = entry as unknown as PresenceState;
        if (value.user_id) {
          onlineUsers.delete(value.user_id);
          lastSeen.set(value.user_id, Date.now());
        }
      });
      updatePresenceLabel();
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await presence.track({ user_id: ownUserId, online_at: new Date().toISOString() });
    });

  supabase
    .channel(`driply-chat-${ownUserId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
      const message = payload.new as RealtimeMessage;
      appendMessage(message);
      window.dispatchEvent(new CustomEvent('driply:notifications-refresh'));
      window.dispatchEvent(new CustomEvent('driply:chat-message-received', { detail: message }));
    })
    .subscribe();
}

export function enableRealtimeExperienceRuntime(): void {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  installStyles();
  patchFetch();
  void startRealtime().catch((error) => console.error('DRIPLY realtime failed', error));
  const observer = new MutationObserver(updatePresenceLabel);
  observer.observe(document.body, { childList: true, subtree: true });
}
