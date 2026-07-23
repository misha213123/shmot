import { api, type ApiProduct } from './api';

let activeProductId = '';
let recommendations: ApiProduct[] = [];
let recent: ApiProduct[] = [];
let trending: ApiProduct[] = [];

const symbols: Record<string, string> = { RUB: '₽', BYN: 'Br', KZT: '₸', UAH: '₴', AMD: '֏', GEL: '₾' };

function cover(product: ApiProduct) {
  return [...product.images].sort((a, b) => a.position - b.position)[0]?.url || '';
}

function price(product: ApiProduct) {
  const value = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(product.price));
  return `${value} ${symbols[product.currency] || product.currency}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
}

function close() { document.querySelector('.recommendation-overlay')?.remove(); }

function productCard(product: ApiProduct) {
  return `<button class="recommendation-card" data-product-id="${product.id}">
    <span class="recommendation-image">${cover(product) ? `<img src="${escapeHtml(cover(product))}" alt="" />` : ''}</span>
    <b>${escapeHtml(product.brand)}</b>
    <span>${escapeHtml(product.title)}</span>
    <strong>${price(product)}</strong>
    <small>${escapeHtml(product.city)} · ${escapeHtml(product.size || '—')}</small>
  </button>`;
}

function openCollection(title: string, subtitle: string, products: ApiProduct[]) {
  close();
  const overlay = document.createElement('div');
  overlay.className = 'recommendation-overlay';
  overlay.innerHTML = `<section class="recommendation-sheet">
    <button class="recommendation-close" aria-label="Закрыть">×</button>
    <span class="recommendation-kicker">DRIPLY SMART FEED</span>
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(subtitle)}</p>
    <div class="recommendation-grid">${products.map(productCard).join('') || '<div class="recommendation-empty">Пока недостаточно данных. Продолжай смотреть и лайкать товары.</div>'}</div>
  </section>`;
  document.body.append(overlay);
  overlay.querySelector('.recommendation-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  overlay.querySelectorAll<HTMLElement>('[data-product-id]').forEach((button) => {
    button.onclick = () => {
      const productId = button.dataset.productId;
      if (!productId) return;
      close();
      window.dispatchEvent(new CustomEvent('driply:open-product-by-id', { detail: { productId } }));
      const searchButton = Array.from(document.querySelectorAll<HTMLButtonElement>('.bottom-nav button')).find((item) => item.textContent?.includes('Поиск'));
      searchButton?.click();
      window.setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('.search-box input');
        const product = [...recommendations, ...recent, ...trending].find((item) => item.id === productId);
        if (input && product) {
          input.value = product.title;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 120);
    };
  });
}

async function loadCollections() {
  const [recommendedResult, recentResult, trendingResult] = await Promise.allSettled([
    api.recommendations(), api.recentlyViewed(), api.trending(),
  ]);
  if (recommendedResult.status === 'fulfilled') recommendations = recommendedResult.value.items;
  if (recentResult.status === 'fulfilled') recent = recentResult.value.items;
  if (trendingResult.status === 'fulfilled') trending = trendingResult.value.items;
}

async function injectSimilar() {
  const card = document.querySelector('.detail-card');
  if (!card || !activeProductId || card.querySelector('.similar-products-section')) return;
  const section = document.createElement('section');
  section.className = 'similar-products-section';
  section.innerHTML = '<div class="similar-heading"><h3>Похожие товары</h3><span>Подбираем…</span></div>';
  card.append(section);
  try {
    const result = await api.similarProducts(activeProductId);
    section.innerHTML = `<div class="similar-heading"><h3>Похожие товары</h3><button type="button">Смотреть все</button></div><div class="similar-strip">${result.items.slice(0, 8).map(productCard).join('')}</div>`;
    section.querySelector('button')?.addEventListener('click', () => openCollection('Похожие товары', 'Подборка по бренду, категории, размеру и цене.', result.items));
    section.querySelectorAll<HTMLElement>('[data-product-id]').forEach((button) => button.onclick = () => {
      const product = result.items.find((item) => item.id === button.dataset.productId);
      if (product) openCollection('Похожие товары', 'Открой товар через поиск DRIPLY.', [product]);
    });
  } catch {
    section.remove();
  }
}

function injectProfileCollections() {
  const profile = document.querySelector('.profile-head');
  if (!profile || document.querySelector('.recommendation-profile-actions')) return;
  const block = document.createElement('section');
  block.className = 'recommendation-profile-actions';
  block.innerHTML = `<button data-rec="personal"><span>✦</span><b>Для тебя</b><small>Персональная подборка</small></button>
    <button data-rec="recent"><span>◷</span><b>Недавно смотрели</b><small>История просмотров</small></button>
    <button data-rec="trending"><span>🔥</span><b>Сейчас популярно</b><small>Товары с высокой активностью</small></button>`;
  profile.insertAdjacentElement('afterend', block);
  block.querySelector<HTMLElement>('[data-rec="personal"]')!.onclick = () => openCollection('Для тебя', 'Лента обучается на просмотрах, лайках, свайпах и подписках.', recommendations);
  block.querySelector<HTMLElement>('[data-rec="recent"]')!.onclick = () => openCollection('Недавно смотрели', 'Товары, которые ты открывал последними.', recent);
  block.querySelector<HTMLElement>('[data-rec="trending"]')!.onclick = () => openCollection('Сейчас популярно', 'Самые активные товары за последние дни.', trending);
}

function bindFeedTabs() {
  const tabs = document.querySelector('.feed-tabs');
  if (!tabs || tabs.getAttribute('data-smart-bound') === '1') return;
  tabs.setAttribute('data-smart-bound', '1');
  const first = tabs.querySelector<HTMLButtonElement>('button');
  if (first) first.onclick = () => openCollection('Для тебя', 'Персональная подборка на основе твоих действий.', recommendations);
}

export function enableRecommendationRuntime(): void {
  if (typeof window === 'undefined') return;
  loadCollections().catch(() => undefined);
  window.setInterval(() => loadCollections().catch(() => undefined), 120000);
  window.addEventListener('driply:product-opened', ((event: CustomEvent<{ productId: string }>) => {
    activeProductId = event.detail.productId;
    window.setTimeout(injectSimilar, 120);
    window.setTimeout(() => loadCollections().catch(() => undefined), 700);
  }) as EventListener);
  const observer = new MutationObserver(() => {
    injectProfileCollections();
    bindFeedTabs();
    if (activeProductId) injectSimilar();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
