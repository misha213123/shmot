import { API_URL } from './api';
import { auth } from './auth';

type ProductSummary = {
  id: string;
  title: string;
};

type ProductList = {
  items?: ProductSummary[];
};

let enabled = false;
let resolving = false;
let replaying = false;
let activeProductId = '';
const productIdsByTitle = new Map<string, string>();

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ');
}

function remember(items: ProductSummary[] | undefined): void {
  items?.forEach((item) => {
    if (item?.id && item?.title) productIdsByTitle.set(normalize(item.title), item.id);
  });
}

async function authorizedJson(path: string): Promise<ProductList> {
  const token = await auth.accessToken();
  if (!token) return {};
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return {};
  return response.json() as Promise<ProductList>;
}

async function refreshProducts(): Promise<void> {
  if (resolving) return;
  resolving = true;
  try {
    const [publicProducts, ownProducts] = await Promise.allSettled([
      authorizedJson('/api/v1/products?status=active'),
      authorizedJson('/api/v1/me/products'),
    ]);
    if (publicProducts.status === 'fulfilled') remember(publicProducts.value.items);
    if (ownProducts.status === 'fulfilled') remember(ownProducts.value.items);
  } finally {
    resolving = false;
  }
}

function visibleProductTitle(): string {
  return document.querySelector<HTMLElement>('.detail-title h1')?.textContent?.trim()
    || document.querySelector<HTMLElement>('.detail-card h1')?.textContent?.trim()
    || '';
}

function resolveVisibleProductId(): string {
  const title = visibleProductTitle();
  if (!title) return activeProductId;
  return productIdsByTitle.get(normalize(title)) || activeProductId;
}

function markProductOpened(productId: string): void {
  if (!productId) return;
  activeProductId = productId;
  void fetch(`${API_URL}/api/v1/products/${productId}/view`, { method: 'POST' }).catch(() => undefined);
  window.dispatchEvent(new CustomEvent('driply:product-opened', { detail: { productId } }));
}

async function prepareAndReplay(button: HTMLButtonElement): Promise<void> {
  await refreshProducts();
  const productId = resolveVisibleProductId();
  if (!productId) {
    window.alert('Не удалось определить товар. Вернись в ленту и открой его ещё раз.');
    return;
  }
  markProductOpened(productId);
  replaying = true;
  button.click();
  replaying = false;
}

function handleClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) return;
  const text = button.textContent?.trim() || '';

  if (!/связаться с продавцом|написать продавцу|^связаться$/i.test(text)) return;
  if (replaying) return;

  const productId = resolveVisibleProductId();
  if (productId) {
    markProductOpened(productId);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  void prepareAndReplay(button);
}

function handlePreparedProduct(event: Event): void {
  const productId = (event as CustomEvent<{ productId?: string }>).detail?.productId || '';
  if (productId) markProductOpened(productId);
}

export function enableChatProductContextRuntime(): void {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  document.addEventListener('click', handleClick, true);
  window.addEventListener('driply:prepare-chat-product', handlePreparedProduct as EventListener);
  void refreshProducts();
}
