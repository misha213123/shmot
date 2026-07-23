import { API_URL } from './api';
import { auth } from './auth';

const reasons = [
  ['fake', 'Подделка'],
  ['prohibited', 'Запрещённый товар'],
  ['spam', 'Спам'],
  ['fraud', 'Мошенничество'],
  ['wrong_info', 'Неверное описание'],
  ['other', 'Другая причина'],
] as const;

let currentProductId = '';
let observer: MutationObserver | null = null;

function closeModal(): void {
  document.querySelector('.report-modal-backdrop')?.remove();
}

async function sendReport(productId: string, reason: string, details: string): Promise<void> {
  const token = await auth.accessToken();
  if (!token) throw new Error('Сначала войдите в аккаунт');
  const response = await fetch(`${API_URL}/api/v1/products/${productId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason, details: details.trim() || null }),
  });
  const body = await response.json().catch(() => ({})) as { detail?: string };
  if (!response.ok) throw new Error(body.detail || 'Не удалось отправить жалобу');
}

function openModal(): void {
  if (!currentProductId || document.querySelector('.report-modal-backdrop')) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'report-modal-backdrop';
  backdrop.innerHTML = `
    <section class="report-modal" role="dialog" aria-modal="true" aria-label="Жалоба на товар">
      <div class="report-modal-head"><div><small>МОДЕРАЦИЯ</small><h2>Пожаловаться</h2></div><button type="button" data-report-close>×</button></div>
      <p>Выбери причину. Продавец не увидит, кто отправил жалобу.</p>
      <div class="report-reasons">${reasons.map(([value, label], index) => `<label><input type="radio" name="report-reason" value="${value}" ${index === 0 ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div>
      <textarea data-report-details maxlength="1000" placeholder="Опиши проблему подробнее (необязательно)"></textarea>
      <p class="report-error" hidden></p>
      <button type="button" class="report-submit">Отправить жалобу</button>
    </section>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(); });
  backdrop.querySelector('[data-report-close]')?.addEventListener('click', closeModal);
  backdrop.querySelector('.report-submit')?.addEventListener('click', async () => {
    const submit = backdrop.querySelector<HTMLButtonElement>('.report-submit');
    const error = backdrop.querySelector<HTMLElement>('.report-error');
    const selected = backdrop.querySelector<HTMLInputElement>('input[name="report-reason"]:checked');
    const details = backdrop.querySelector<HTMLTextAreaElement>('[data-report-details]');
    if (!submit || !error || !selected || !details) return;
    submit.disabled = true; submit.textContent = 'Отправляем…'; error.hidden = true;
    try {
      await sendReport(currentProductId, selected.value, details.value);
      submit.textContent = 'Жалоба отправлена ✓';
      window.setTimeout(closeModal, 900);
    } catch (reason) {
      error.textContent = reason instanceof Error ? reason.message : 'Не удалось отправить жалобу';
      error.hidden = false; submit.disabled = false; submit.textContent = 'Отправить жалобу';
    }
  });
}

function mountButton(): void {
  const detail = document.querySelector<HTMLElement>('.detail-card');
  if (!detail || detail.querySelector('.report-product-button')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'report-product-button';
  button.textContent = '⚑ Пожаловаться на объявление';
  button.addEventListener('click', openModal);
  detail.appendChild(button);
}

export function enableReportRuntime(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('driply:product-opened', ((event: CustomEvent<{ productId?: string }>) => {
    currentProductId = event.detail?.productId || '';
    window.setTimeout(mountButton, 30);
  }) as EventListener);
  observer = new MutationObserver(mountButton);
  observer.observe(document.body, { childList: true, subtree: true });
}
