import { API_URL } from './api';
import { auth } from './auth';

type Offer = {
  id: string; product_id: string; product_title: string; product_image: string | null;
  buyer_id: string; buyer_username: string; seller_id: string; seller_username: string;
  amount: string; counter_amount: string | null; currency: string;
  status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'cancelled'; created_at: string;
};

type Deal = {
  id: string; offer_id: string; product_id: string; product_title: string; product_image: string | null;
  buyer_id: string; buyer_username: string; seller_id: string; seller_username: string;
  amount: string; currency: string; status: 'agreed' | 'paid' | 'shipped' | 'received' | 'completed' | 'cancelled'; created_at: string;
};

let currentProductId = '';
let currentUserId = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const session = await auth.session();
  if (!session) throw new Error('Сначала войдите в аккаунт');
  currentUserId = session.user.id;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(options?.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(body.detail || `Ошибка ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function money(value: string, currency: string) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(value))} ${currency}`;
}

function closePanel() { document.querySelector('.deal-overlay')?.remove(); }

function showToast(text: string) {
  const toast = document.createElement('div');
  toast.className = 'deal-toast'; toast.textContent = text;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function offerModal(productId: string) {
  closePanel();
  const overlay = document.createElement('div'); overlay.className = 'deal-overlay';
  overlay.innerHTML = `<section class="deal-sheet deal-offer-sheet"><button class="deal-close" aria-label="Закрыть">×</button><span class="deal-kicker">ПРЕДЛОЖЕНИЕ ЦЕНЫ</span><h2>Сколько готов заплатить?</h2><p>Продавец сможет принять, отклонить или предложить другую цену.</p><label>Ваша цена<input inputmode="decimal" type="number" min="1" step="0.01" placeholder="Например, 280" /></label><button class="deal-primary">Отправить предложение</button><small class="deal-error"></small></section>`;
  document.body.append(overlay);
  overlay.querySelector('.deal-close')?.addEventListener('click', closePanel);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closePanel(); });
  const input = overlay.querySelector('input') as HTMLInputElement;
  const error = overlay.querySelector('.deal-error') as HTMLElement;
  (overlay.querySelector('.deal-primary') as HTMLButtonElement).onclick = async () => {
    const amount = Number(input.value);
    if (!Number.isFinite(amount) || amount <= 0) { error.textContent = 'Введите корректную сумму'; return; }
    try {
      await request<Offer>('/api/v1/me/offers', { method: 'POST', body: JSON.stringify({ product_id: productId, amount }) });
      closePanel(); showToast('Предложение отправлено продавцу');
    } catch (reason) { error.textContent = reason instanceof Error ? reason.message : 'Не удалось отправить'; }
  };
  window.setTimeout(() => input.focus(), 180);
}

async function actOffer(offer: Offer, action: 'accept' | 'reject' | 'counter') {
  if (action === 'counter') {
    const raw = window.prompt('Введите встречную цену');
    if (!raw) return;
    await request(`/api/v1/me/offers/${offer.id}/counter`, { method: 'PATCH', body: JSON.stringify({ amount: Number(raw.replace(',', '.')) }) });
  } else {
    await request(`/api/v1/me/offers/${offer.id}/${action}`, { method: 'PATCH', body: JSON.stringify({}) });
  }
  await openDealCenter();
}

async function updateDeal(deal: Deal, status: Deal['status']) {
  await request(`/api/v1/me/deals/${deal.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  await openDealCenter();
}

function nextDealAction(deal: Deal): { label: string; status: Deal['status'] } | null {
  if (deal.status === 'agreed' && deal.buyer_id === currentUserId) return { label: 'Отметить оплату', status: 'paid' };
  if (deal.status === 'paid' && deal.seller_id === currentUserId) return { label: 'Товар отправлен', status: 'shipped' };
  if (deal.status === 'shipped' && deal.buyer_id === currentUserId) return { label: 'Товар получен', status: 'received' };
  if (deal.status === 'received' && deal.buyer_id === currentUserId) return { label: 'Завершить сделку', status: 'completed' };
  return null;
}

const offerLabels: Record<Offer['status'], string> = { pending: 'Ожидает ответа', countered: 'Встречное предложение', accepted: 'Принято', rejected: 'Отклонено', cancelled: 'Отменено' };
const dealLabels: Record<Deal['status'], string> = { agreed: 'Согласовано', paid: 'Оплачено', shipped: 'Отправлено', received: 'Получено', completed: 'Завершено', cancelled: 'Отменено' };

async function openDealCenter() {
  closePanel();
  const overlay = document.createElement('div'); overlay.className = 'deal-overlay';
  overlay.innerHTML = `<section class="deal-sheet deal-center"><button class="deal-close" aria-label="Закрыть">×</button><span class="deal-kicker">DRIPLY DEALS</span><h2>Покупки и продажи</h2><div class="deal-loading">Загружаем сделки…</div></section>`;
  document.body.append(overlay);
  overlay.querySelector('.deal-close')?.addEventListener('click', closePanel);
  try {
    const [offers, deals] = await Promise.all([request<Offer[]>('/api/v1/me/offers'), request<Deal[]>('/api/v1/me/deals')]);
    const center = overlay.querySelector('.deal-center') as HTMLElement;
    const offerCards = offers.map((offer) => {
      const isSeller = offer.seller_id === currentUserId;
      const canSellerAnswer = isSeller && offer.status === 'pending';
      const canBuyerAnswerCounter = !isSeller && offer.status === 'countered';
      const shownAmount = offer.counter_amount || offer.amount;
      return `<article class="deal-card"><div class="deal-card-main">${offer.product_image ? `<img src="${offer.product_image}" alt="" />` : ''}<div><span>${isSeller ? 'Вам предлагают' : 'Ваше предложение'}</span><b>${offer.product_title}</b><strong>${money(shownAmount, offer.currency)}</strong><small>${offerLabels[offer.status]} · @${isSeller ? offer.buyer_username : offer.seller_username}</small></div></div>${canSellerAnswer ? `<div class="deal-actions"><button data-offer="${offer.id}" data-action="accept">Принять</button><button data-offer="${offer.id}" data-action="counter">Встречная</button><button data-offer="${offer.id}" data-action="reject" class="deal-muted">Отклонить</button></div>` : canBuyerAnswerCounter ? `<div class="deal-actions"><button data-offer="${offer.id}" data-action="accept">Принять ${money(shownAmount, offer.currency)}</button><button data-offer="${offer.id}" data-action="reject" class="deal-muted">Отказаться</button></div>` : ''}</article>`;
    }).join('');
    const dealCards = deals.map((deal) => {
      const action = nextDealAction(deal);
      const isBuyer = deal.buyer_id === currentUserId;
      return `<article class="deal-card deal-active"><div class="deal-card-main">${deal.product_image ? `<img src="${deal.product_image}" alt="" />` : ''}<div><span>${isBuyer ? 'Покупка' : 'Продажа'}</span><b>${deal.product_title}</b><strong>${money(deal.amount, deal.currency)}</strong><small>${dealLabels[deal.status]} · @${isBuyer ? deal.seller_username : deal.buyer_username}</small></div></div><div class="deal-timeline"><i class="done"></i><i class="${['paid','shipped','received','completed'].includes(deal.status) ? 'done' : ''}"></i><i class="${['shipped','received','completed'].includes(deal.status) ? 'done' : ''}"></i><i class="${['received','completed'].includes(deal.status) ? 'done' : ''}"></i><i class="${deal.status === 'completed' ? 'done' : ''}"></i></div>${action ? `<button class="deal-primary deal-next" data-deal="${deal.id}" data-status="${action.status}">${action.label}</button>` : ''}${!['completed','cancelled','shipped','received'].includes(deal.status) ? `<button class="deal-cancel" data-deal="${deal.id}" data-status="cancelled">Отменить сделку</button>` : ''}</article>`;
    }).join('');
    center.querySelector('.deal-loading')?.remove();
    center.insertAdjacentHTML('beforeend', `<div class="deal-tabs-title">Активные сделки</div>${dealCards || '<p class="deal-empty">Активных сделок пока нет</p>'}<div class="deal-tabs-title">Предложения цены</div>${offerCards || '<p class="deal-empty">Предложений пока нет</p>'}`);
    center.querySelectorAll<HTMLElement>('[data-offer]').forEach((button) => button.onclick = async () => {
      const offer = offers.find((item) => item.id === button.dataset.offer); if (!offer) return;
      try { await actOffer(offer, button.dataset.action as 'accept' | 'reject' | 'counter'); } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Ошибка'); }
    });
    center.querySelectorAll<HTMLElement>('[data-deal]').forEach((button) => button.onclick = async () => {
      const deal = deals.find((item) => item.id === button.dataset.deal); if (!deal) return;
      try { await updateDeal(deal, button.dataset.status as Deal['status']); } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Ошибка'); }
    });
  } catch (reason) {
    const loading = overlay.querySelector('.deal-loading'); if (loading) loading.textContent = reason instanceof Error ? reason.message : 'Не удалось загрузить сделки';
  }
}

function injectOfferButton() {
  const card = document.querySelector('.detail-card');
  if (!card || !currentProductId || card.querySelector('.deal-offer-button')) return;
  const sellerSection = card.querySelector('.detail-seller');
  if (!sellerSection) return;
  const button = document.createElement('button');
  button.className = 'deal-offer-button'; button.textContent = 'Предложить свою цену';
  button.onclick = () => offerModal(currentProductId);
  sellerSection.insertAdjacentElement('afterend', button);
}

function injectDealsEntry() {
  const profile = document.querySelector('.profile-head');
  if (!profile || profile.querySelector('.deal-center-button')) return;
  const button = document.createElement('button');
  button.className = 'deal-center-button'; button.innerHTML = '<span>⇄</span><b>Мои покупки и продажи</b><small>Предложения цены и статусы сделок</small>';
  button.onclick = openDealCenter;
  profile.insertAdjacentElement('afterend', button);
}

export function enableDealRuntime(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('driply:product-opened', ((event: CustomEvent<{ productId: string }>) => {
    currentProductId = event.detail.productId;
    window.setTimeout(injectOfferButton, 80);
    window.setTimeout(injectOfferButton, 350);
  }) as EventListener);
  const observer = new MutationObserver(() => { injectOfferButton(); injectDealsEntry(); });
  observer.observe(document.body, { childList: true, subtree: true });
  auth.session().then((session) => { currentUserId = session?.user.id || ''; }).catch(() => undefined);
}
