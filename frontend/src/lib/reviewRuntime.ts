import { API_URL } from './api';

type Product = { seller_id: string };
type Review = {
  id: string; author_username: string; author_display_name: string;
  rating: number; comment: string | null; created_at: string;
};
type Rating = { rating: string; reviews_count: number };

let currentProductId = '';
let loading = false;
let renderedSellerId = '';

function stars(value: number): string {
  return `${'★'.repeat(Math.max(0, Math.min(5, value)))}${'☆'.repeat(Math.max(0, 5 - value))}`;
}

async function injectSellerReviews() {
  const hero = document.querySelector('.seller-profile-hero');
  if (!hero || !currentProductId || loading) return;
  loading = true;
  try {
    const productResponse = await fetch(`${API_URL}/api/v1/products/${currentProductId}`);
    if (!productResponse.ok) return;
    const product = await productResponse.json() as Product;
    if (renderedSellerId === product.seller_id && document.querySelector('.seller-reviews-block')) return;
    const [reviewsResponse, ratingResponse] = await Promise.all([
      fetch(`${API_URL}/api/v1/profiles/${product.seller_id}/reviews`),
      fetch(`${API_URL}/api/v1/profiles/${product.seller_id}/rating`),
    ]);
    if (!reviewsResponse.ok || !ratingResponse.ok) return;
    const reviews = await reviewsResponse.json() as Review[];
    const rating = await ratingResponse.json() as Rating;
    document.querySelector('.seller-reviews-block')?.remove();
    const section = document.createElement('section');
    section.className = 'seller-reviews-block motion-pop';
    section.innerHTML = `<header><div><span>РЕПУТАЦИЯ</span><h3>Отзывы покупателей</h3></div><div class="seller-rating-total"><b>${Number(rating.rating).toFixed(1)}</b><span>${stars(Math.round(Number(rating.rating)))}</span><small>${rating.reviews_count} отзывов</small></div></header><div class="seller-review-list">${reviews.length ? reviews.map((review) => `<article><div><b>${review.author_display_name || review.author_username}</b><span>${stars(review.rating)}</span></div>${review.comment ? `<p>${review.comment.replace(/[<>&]/g, '')}</p>` : '<p class="review-no-comment">Без комментария</p>'}<small>@${review.author_username} · ${new Date(review.created_at).toLocaleDateString('ru-RU')}</small></article>`).join('') : '<div class="seller-reviews-empty">У продавца пока нет отзывов</div>'}</div>`;
    const productsTitle = document.querySelector('.seller-section-title');
    if (productsTitle) productsTitle.insertAdjacentElement('beforebegin', section);
    else hero.insertAdjacentElement('afterend', section);
    renderedSellerId = product.seller_id;
  } finally {
    loading = false;
  }
}

export function enableReviewRuntime(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('driply:product-opened', ((event: CustomEvent<{ productId: string }>) => {
    currentProductId = event.detail.productId;
    renderedSellerId = '';
  }) as EventListener);
  const observer = new MutationObserver(() => {
    if (document.querySelector('.seller-profile-hero')) void injectSellerReviews();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
