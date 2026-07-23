import { API_URL } from './api';

type Product = {
  id: string; title: string; brand: string; category: string; description: string;
  size: string | null; condition: string; price: string; currency: string; city: string;
  delivery: string | null; images: Array<{ url: string; position: number }>;
  seller: { username: string };
};

type SearchResponse = { items: Product[]; total: number };

type Filters = {
  q: string; country: string; city: string; category: string; brand: string; seller: string;
  size: string; condition: string; currency: string; delivery: string;
  min_price: string; max_price: string; sort: string;
};

const STORAGE_KEY = 'driply.advanced-filters';
const defaults: Filters = { q: '', country: '', city: '', category: '', brand: '', seller: '', size: '', condition: '', currency: '', delivery: '', min_price: '', max_price: '', sort: 'newest' };

function readFilters(): Filters {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return { ...defaults }; }
}

function closeSearch() { document.querySelector('.advanced-search-overlay')?.remove(); }
function money(product: Product) { return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(product.price))} ${product.currency}`; }
function cover(product: Product) { return [...product.images].sort((a, b) => a.position - b.position)[0]?.url || ''; }
function escapeHtml(value: string) { const node = document.createElement('div'); node.textContent = value; return node.innerHTML; }

async function runSearch(filters: Filters): Promise<SearchResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  const response = await fetch(`${API_URL}/api/v1/search/products?${params}`);
  if (!response.ok) throw new Error('Не удалось выполнить поиск');
  return response.json() as Promise<SearchResponse>;
}

function productPreview(product: Product) {
  const old = document.querySelector('.advanced-product-preview');
  old?.remove();
  const layer = document.createElement('div');
  layer.className = 'advanced-product-preview';
  layer.innerHTML = `<section><button class="advanced-close" aria-label="Закрыть">×</button>${cover(product) ? `<img src="${cover(product)}" alt="${escapeHtml(product.title)}" />` : ''}<span>${escapeHtml(product.brand)}</span><h2>${escapeHtml(product.title)}</h2><strong>${money(product)}</strong><div class="advanced-specs"><b>${escapeHtml(product.size || 'Размер не указан')}</b><b>${escapeHtml(product.condition)}</b><b>${escapeHtml(product.city)}</b></div><p>${escapeHtml(product.description)}</p>${product.delivery ? `<small>Получение: ${escapeHtml(product.delivery)}</small>` : ''}<a href="https://t.me/${escapeHtml(product.seller.username)}" target="_blank" rel="noreferrer">Написать продавцу</a></section>`;
  document.body.append(layer);
  layer.querySelector('.advanced-close')?.addEventListener('click', () => layer.remove());
  layer.addEventListener('click', (event) => { if (event.target === layer) layer.remove(); });
}

function renderResults(root: HTMLElement, response: SearchResponse) {
  const target = root.querySelector('.advanced-results') as HTMLElement;
  target.innerHTML = `<div class="advanced-result-head"><b>Найдено: ${response.total}</b><span>${response.items.length} показано</span></div>${response.items.length ? `<div class="advanced-result-grid">${response.items.map((product) => `<button data-product="${product.id}">${cover(product) ? `<img src="${cover(product)}" alt="" />` : '<i>Нет фото</i>'}<span>${escapeHtml(product.brand)}</span><b>${escapeHtml(product.title)}</b><strong>${money(product)}</strong><small>${escapeHtml(product.city)} · @${escapeHtml(product.seller.username)}</small></button>`).join('')}</div>` : '<div class="advanced-empty"><b>Товары не найдены</b><p>Измени или сбрось часть фильтров.</p></div>'}`;
  target.querySelectorAll<HTMLElement>('[data-product]').forEach((button) => {
    const product = response.items.find((item) => item.id === button.dataset.product);
    if (product) button.onclick = () => productPreview(product);
  });
}

async function openAdvancedSearch(initialQuery = '') {
  closeSearch();
  const values = readFilters();
  if (initialQuery) values.q = initialQuery;
  const overlay = document.createElement('div');
  overlay.className = 'advanced-search-overlay';
  overlay.innerHTML = `<section class="advanced-search-sheet"><header><div><span>DRIPLY SEARCH</span><h2>Поиск и фильтры</h2></div><button class="advanced-close" aria-label="Закрыть">×</button></header><form class="advanced-form"><label class="advanced-wide">Что ищем<input name="q" value="${escapeHtml(values.q)}" placeholder="Nike, худи, кроссовки или @продавец" /></label><label>Страна<select name="country"><option value="">Все</option><option value="RU">Россия</option><option value="BY">Беларусь</option><option value="KZ">Казахстан</option><option value="UA">Украина</option><option value="AM">Армения</option><option value="GE">Грузия</option></select></label><label>Город<input name="city" value="${escapeHtml(values.city)}" placeholder="Минск" /></label><label>Категория<select name="category"><option value="">Все категории</option><option>Кроссовки</option><option>Куртки</option><option>Худи</option><option>Футболки</option><option>Брюки</option><option>Аксессуары</option></select></label><label>Бренд<input name="brand" value="${escapeHtml(values.brand)}" placeholder="Nike" /></label><label>Размер<input name="size" value="${escapeHtml(values.size)}" placeholder="M, 42, 9 US" /></label><label>Состояние<select name="condition"><option value="">Любое</option><option>Новое</option><option>Как новое</option><option>Хорошее</option><option>Есть следы носки</option></select></label><label>Цена от<input name="min_price" inputmode="decimal" type="number" min="0" value="${escapeHtml(values.min_price)}" /></label><label>Цена до<input name="max_price" inputmode="decimal" type="number" min="0" value="${escapeHtml(values.max_price)}" /></label><label>Валюта<select name="currency"><option value="">Любая</option><option>RUB</option><option>BYN</option><option>KZT</option><option>UAH</option><option>AMD</option><option>GEL</option></select></label><label>Получение<select name="delivery"><option value="">Любое</option><option value="shipping">Отправка</option><option value="meeting">Личная встреча</option><option value="both">Оба варианта</option></select></label><label class="advanced-wide">Сортировка<select name="sort"><option value="newest">Сначала новые</option><option value="price_asc">Сначала дешевле</option><option value="price_desc">Сначала дороже</option><option value="popular">Популярные</option></select></label><div class="advanced-actions advanced-wide"><button type="button" class="advanced-reset">Сбросить</button><button type="submit">Показать товары</button></div></form><div class="advanced-results"></div></section>`;
  document.body.append(overlay);
  (overlay.querySelector(`[name="country"]`) as HTMLSelectElement).value = values.country;
  (overlay.querySelector(`[name="category"]`) as HTMLSelectElement).value = values.category;
  (overlay.querySelector(`[name="condition"]`) as HTMLSelectElement).value = values.condition;
  (overlay.querySelector(`[name="currency"]`) as HTMLSelectElement).value = values.currency;
  (overlay.querySelector(`[name="delivery"]`) as HTMLSelectElement).value = values.delivery;
  (overlay.querySelector(`[name="sort"]`) as HTMLSelectElement).value = values.sort;
  overlay.querySelector('.advanced-close')?.addEventListener('click', closeSearch);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closeSearch(); });
  overlay.querySelector('.advanced-reset')?.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); closeSearch(); openAdvancedSearch(); });
  const form = overlay.querySelector('form') as HTMLFormElement;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const filters = Object.fromEntries(Object.keys(defaults).map((key) => [key, String(data.get(key) || '')])) as Filters;
    if (filters.min_price && filters.max_price && Number(filters.min_price) > Number(filters.max_price)) {
      [filters.min_price, filters.max_price] = [filters.max_price, filters.min_price];
      (form.elements.namedItem('min_price') as HTMLInputElement).value = filters.min_price;
      (form.elements.namedItem('max_price') as HTMLInputElement).value = filters.max_price;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    const results = overlay.querySelector('.advanced-results') as HTMLElement;
    results.innerHTML = '<div class="advanced-searching">Ищем подходящие вещи…</div>';
    try { renderResults(overlay, await runSearch(filters)); }
    catch (reason) { results.innerHTML = `<div class="advanced-empty"><b>${reason instanceof Error ? escapeHtml(reason.message) : 'Ошибка поиска'}</b></div>`; }
  };
  form.requestSubmit();
}

function injectButtons() {
  document.querySelectorAll<HTMLElement>('.topbar').forEach((topbar) => {
    const buttons = topbar.querySelectorAll<HTMLButtonElement>('button');
    const last = buttons.item(buttons.length - 1);
    if (!last || last.dataset.advancedSearch === '1' || topbar.querySelector('.brand strong')?.textContent?.trim() === 'Профиль') return;
    last.dataset.advancedSearch = '1';
    last.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); openAdvancedSearch(); }, true);
  });
  const searchBox = document.querySelector('.search-box');
  if (searchBox && !searchBox.querySelector('.advanced-search-trigger')) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'advanced-search-trigger'; button.textContent = 'Фильтры';
    button.onclick = () => openAdvancedSearch((searchBox.querySelector('input') as HTMLInputElement)?.value || '');
    searchBox.append(button);
  }
}

export function enableAdvancedSearchRuntime(): void {
  if (typeof window === 'undefined') return;
  const observer = new MutationObserver(injectButtons);
  observer.observe(document.body, { childList: true, subtree: true });
  injectButtons();
}
