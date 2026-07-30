import { auth } from './auth';
import { API_URL } from './api';

let enabled = false;

async function warmChats(): Promise<void> {
  try {
    const token = await auth.accessToken();
    if (!token) return;
    await fetch(`${API_URL}/api/v1/me/chats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Warming is optional.
  }
}

function openMessagesPanel(): void {
  const realTopbarButton = document.querySelector<HTMLButtonElement>('.topbar button:first-child');
  if (realTopbarButton) {
    realTopbarButton.click();
    return;
  }

  const fakeTopbar = document.createElement('div');
  fakeTopbar.className = 'topbar';
  fakeTopbar.style.display = 'none';
  fakeTopbar.innerHTML = '<button type="button"></button><div class="brand"><strong>DRIPLY</strong></div>';
  document.body.append(fakeTopbar);
  fakeTopbar.querySelector<HTMLButtonElement>('button')?.click();
  fakeTopbar.remove();
}

function clickLatestConversation(attempt = 0): void {
  const row = document.querySelector<HTMLButtonElement>('.conversation-list .conversation-row');
  if (row) {
    row.click();
    return;
  }
  if (attempt >= 40) return;
  window.setTimeout(() => clickLatestConversation(attempt + 1), 100);
}

async function openChatFromNotification(): Promise<void> {
  await warmChats();
  openMessagesPanel();
  clickLatestConversation();
}

export function enableNotificationChatBridge(): void {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  void warmChats();
  window.addEventListener('driply:open-chat-for-product', () => {
    void openChatFromNotification();
  });
  window.addEventListener('focus', () => void warmChats());
}
