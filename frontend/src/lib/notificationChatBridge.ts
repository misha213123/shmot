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

function clickSyntheticContact(productId: string): void {
  if (productId) {
    window.dispatchEvent(new CustomEvent('driply:prepare-chat-product', { detail: { productId } }));
  }

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = 'Связаться с продавцом';
  trigger.style.display = 'none';
  document.body.append(trigger);
  trigger.click();
  trigger.remove();
}

async function openChatFromNotification(event: Event): Promise<void> {
  const detail = (event as CustomEvent<{ productId?: string }>).detail;
  await warmChats();
  clickSyntheticContact(detail?.productId || '');
}

export function enableNotificationChatBridge(): void {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  void warmChats();
  window.addEventListener('driply:open-chat-for-product', (event) => {
    void openChatFromNotification(event);
  });
  window.addEventListener('focus', () => void warmChats());
}
