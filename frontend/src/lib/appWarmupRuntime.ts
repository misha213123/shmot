import { auth } from './auth';
import { API_URL } from './api';

let enabled = false;
let timer: number | null = null;

async function protectedFetch(path: string): Promise<void> {
  try {
    const token = await auth.accessToken();
    if (!token) return;
    await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    // Warmup must never block the UI.
  }
}

async function warmEverything(): Promise<void> {
  void fetch(`${API_URL}/health`, { cache: 'no-store' }).catch(() => undefined);
  await Promise.allSettled([
    protectedFetch('/api/v1/me/profile'),
    protectedFetch('/api/v1/me/chats'),
    protectedFetch('/api/v1/me/notifications'),
    protectedFetch('/api/v1/me/products'),
    protectedFetch('/api/v1/products?status=active'),
  ]);
}

export function enableAppWarmupRuntime(): void {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  void warmEverything();
  timer = window.setInterval(() => {
    void fetch(`${API_URL}/health`, { cache: 'no-store' }).catch(() => undefined);
  }, 240000);
  window.addEventListener('focus', () => void warmEverything());
  window.addEventListener('beforeunload', () => {
    if (timer) window.clearInterval(timer);
  }, { once: true });
}
