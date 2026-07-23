import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronLeft, Heart, Home, MessageCircle, Phone, Plus, Search, Settings, SlidersHorizontal, User, X } from 'lucide-react';

import CreateProductScreen from './CreateProductScreen';
import { api, type ApiProduct, type ApiProfile } from '../lib/api';
import '../styles/gestures.css';
import '../styles/stability.css';
import '../styles/gallery.css';
import '../styles/seller-profile.css';

type Screen = 'feed' | 'explore' | 'create' | 'likes' | 'profile' | 'seller' | 'product' | 'messages' | 'filters';
type Props = { profile: ApiProfile };

const countryNames: Record<string, string> = {
  RU: 'Россия', BY: 'Беларусь', KZ: 'Казахстан', UA: 'Украина', AM: 'Армения', GE: 'Грузия',
};
const currencySymbols: Record<string, string> = { RUB: '₽', BYN: 'Br', KZT: '₸', UAH: '₴', AMD: '֏', GEL: '₾' };

function formatPrice(product: ApiProduct) {
  const value = Number(product.price);
  const formatted = Number.isFinite(value) ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) : product.price;
  return `${formatted} ${currencySymbols[product.currency] || product.currency}`;
}
function orderedImages(product: ApiProduct) { return [...product.images].sort((a, b) => a.position - b.position); }
function cover(product: ApiProduct) { return orderedImages(product)[0]?.url || ''; }
function initials(name: string) { return (name || 'U').trim().slice(0, 1).toUpperCase(); }

export default function MarketplaceApp({ profile }: Props) {
  const [screen, setScreen] = useState<Screen>('feed');
  const [feedProducts, setFeedProducts] = useState<ApiProduct[]>([]);
  const [myProducts, setMyProducts] = useState<ApiProduct[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<ApiProduct[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<ApiProfile | null>(null);
  const [sellerProducts, setSellerProducts] = useState<ApiProduct[]>([]);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [feedIndex, setFeedIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cardMotion, setCardMotion] = useState<'left' | 'right' | 'back' | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const refreshMarketplace = async () => {
    const [feedResult, mineResult, favoritesResult] = await Promise.allSettled([
      api.products({ status: 'active' }), api.myProducts(), api.favorites(profile.id),
    ]);
    if (feedResult.status === 'fulfilled') {
      setFeedProducts(feedResult.value.items);
      setFeedIndex((current) => Math.min(current, Math.max(feedResult.value.items.length - 1, 0)));
    }
    if (mineResult.status === 'fulfilled') setMyProducts(mineResult.value.items);
    if (favoritesResult.status === 'fulfilled') {
      setFavoriteProducts(favoritesResult.value.items);
      setLiked(favoritesResult.value.items.map((item) => item.id));
    }
    setLoadingProducts(false);
  };

  useEffect(() => { refreshMarketplace().catch(() => setLoadingProducts(false)); }, [profile.id]);

  const currentFeedProduct = feedProducts[feedIndex];
  const selectedProduct = useMemo(() =>
    [...myProducts, ...feedProducts, ...favoriteProducts].find((item) => item.id === selectedId) || currentFeedProduct,
  [favoriteProducts, feedProducts, currentFeedProduct, myProducts, selectedId]);
  const filtered = useMemo(() => feedProducts.filter((item) =>
    `${item.brand} ${item.title} ${item.category} ${item.city}`.toLowerCase().includes(query.toLowerCase())), [feedProducts, query]);
  const ownLocation = [profile.city, countryNames[profile.country_code] || profile.country_code].filter(Boolean).join(', ');

  const navigate = (next: Screen) => {
    setScreen(next); setPhotoIndex(0);
    document.querySelector('.app-shell')?.scrollTo({ top: 0, behavior: 'auto' });
  };
  const showNotice = (text: string) => {
    setNotice(text);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 1900);
  };
  const openProduct = (product: ApiProduct) => {
    setSelectedId(product.id); setPhotoIndex(0); navigate('product');
    api.recordView(product.id).catch(() => undefined);
  };

  const openSeller = async (product: ApiProduct) => {
    if (product.seller_id === profile.id) { navigate('profile'); return; }
    setSellerLoading(true);
    setSelectedSeller({
      id: product.seller.id, email: null, username: product.seller.username,
      display_name: product.seller.display_name, avatar_url: product.seller.avatar_url,
      phone: null, country_code: product.seller.country_code, city: product.seller.city,
      bio: null, is_verified: product.seller.is_verified, rating: product.seller.rating, created_at: '',
    });
    setSellerProducts(feedProducts.filter((item) => item.seller_id === product.seller_id));
    navigate('seller');
    try {
      const fullProfile = await api.profile(product.seller_id);
      setSelectedSeller(fullProfile);
      const products = await api.products({ seller_id: product.seller_id, status: 'active' });
      setSellerProducts(products.items);
    } catch {
      showNotice('Показываем доступные данные продавца');
    } finally { setSellerLoading(false); }
  };

  const contactSeller = (seller: ApiProfile | null) => {
    if (!seller?.phone) { showNotice('Продавец пока не указал контакт'); return; }
    if (seller.phone.startsWith('@')) window.open(`https://t.me/${seller.phone.slice(1)}`, '_blank', 'noopener,noreferrer');
    else window.location.href = `tel:${seller.phone.replace(/\s/g, '')}`;
  };

  const moveFeed = (direction: 'next' | 'previous', action?: 'skip' | 'like') => {
    if (!feedProducts.length || cardMotion) return;
    const product = feedProducts[feedIndex];
    if (direction === 'previous') {
      const previousIndex = history.at(-1);
      if (previousIndex === undefined) { showNotice('Это первый просмотренный товар'); return; }
      setCardMotion('back');
      window.setTimeout(() => { setFeedIndex(previousIndex); setHistory((items) => items.slice(0, -1)); setPhotoIndex(0); setCardMotion(null); }, 230);
      return;
    }
    setHistory((items) => [...items.slice(-19), feedIndex]);
    setCardMotion(action === 'like' ? 'right' : 'left');
    if (action) api.swipe(product.id, action).catch(() => undefined);
    window.setTimeout(() => {
      setFeedIndex((current) => feedProducts.length > 1 ? (current + 1) % feedProducts.length : current);
      setSelectedId(''); setPhotoIndex(0); setCardMotion(null);
    }, 260);
  };

  const toggleLike = async (product: ApiProduct) => {
    const isLiked = liked.includes(product.id);
    setLiked((current) => isLiked ? current.filter((id) => id !== product.id) : [...current, product.id]);
    setFavoriteProducts((current) => isLiked ? current.filter((item) => item.id !== product.id) : current.some((item) => item.id === product.id) ? current : [product, ...current]);
    try { if (isLiked) await api.removeFavorite(product.id); else await api.addFavorite(product.id); }
    catch { showNotice('Не удалось обновить избранное'); refreshMarketplace().catch(() => undefined); }
  };
  const likeAndNext = async (product: ApiProduct) => { if (!liked.includes(product.id)) await toggleLike(product); moveFeed('next', 'like'); };

  const header = (title = 'DRIPLY', back = false, onBack?: () => void) => (
    <header className="topbar motion-header">
      <button className="icon-button pressable" onClick={() => back ? (onBack ? onBack() : navigate('feed')) : showNotice('Уведомлений пока нет')}>
        {back ? <ChevronLeft /> : <Bell size={21} />}
      </button>
      <div className="brand"><strong>{title}</strong>{title === 'DRIPLY' && <span>ЛИСТАЙ. НАХОДИ. НОСИ.</span>}</div>
      <button className="icon-button pressable" onClick={() => title === 'Профиль' ? showNotice('Редактирование профиля — следующий этап') : navigate('filters')}>
        {title === 'Профиль' ? <Settings size={21} /> : <SlidersHorizontal size={21} />}
      </button>
    </header>
  );

  const productGrid = (items: ApiProduct[]) => <div className="product-grid">{items.map((item) =>
    <button key={item.id} className="grid-item pressable-card motion-pop" onClick={() => openProduct(item)}>
      <img src={cover(item)} alt={item.title} /><b>{formatPrice(item)}</b><span>{item.title}</span>
    </button>)}</div>;

  const renderFeed = () => {
    const product = currentFeedProduct;
    if (loadingProducts) return <>{header()}<div className="empty-state motion-pop"><b>Загружаем свежие вещи…</b></div></>;
    if (!product) return <>{header()}<div className="empty-state motion-pop"><b>В ленте пока нет товаров</b><p>Опубликуй первую вещь — она появится здесь.</p><button className="primary-button" onClick={() => navigate('create')}>Добавить товар</button></div></>;
    const images = orderedImages(product); const activeImage = images[photoIndex % Math.max(images.length, 1)];
    return <>{header()}<nav className="feed-tabs motion-tabs"><button className="active">Для вас</button><button onClick={() => showNotice('Подписки появятся позже')}>Подписки</button><button onClick={() => showNotice(`Показываем товары рядом с ${profile.city}`)}>Рядом</button></nav>
      <section className="swipe-stage"><div className="card-stack-shadow card-stack-shadow-one" /><div className="card-stack-shadow card-stack-shadow-two" />
        <article className={`product-card draggable-card ${cardMotion ? `swipe-${cardMotion}` : ''}`} onClick={() => openProduct(product)}>
          {activeImage && <img src={activeImage.url} alt={product.title} draggable={false} />}
          {images.length > 1 && <div className="photo-progress">{images.map((image, index) => <span key={image.id} className={index === photoIndex ? 'active' : ''} />)}</div>}
          <div className="photo-tap-zones"><button type="button" onClick={(e) => { e.stopPropagation(); setPhotoIndex((v) => (v - 1 + images.length) % images.length); }} /><button type="button" onClick={(e) => { e.stopPropagation(); setPhotoIndex((v) => (v + 1) % images.length); }} /></div>
          <div className="product-gradient" /><div className="product-copy top-copy"><span className="eyebrow">{product.brand}</span><span>{product.title}</span></div><span className="new-badge">НОВОЕ</span>
          <div className="product-copy bottom-copy"><span>{product.size || '—'} · {product.city}</span><strong>{formatPrice(product)}</strong></div><span className="likes"><Heart size={16} /> {product.favorites_count + (liked.includes(product.id) ? 1 : 0)}</span>
        </article></section>
      <section className="swipe-actions motion-actions"><button className="round secondary pressable" onClick={() => moveFeed('previous')}>↶</button><button className="round secondary pressable danger-action" onClick={() => moveFeed('next', 'skip')}><X /></button><button className={`round primary pressable like-action ${liked.includes(product.id) ? 'is-liked' : ''}`} onClick={() => likeAndNext(product)}><Heart fill="currentColor" /></button><button className="round secondary pressable boost-action" onClick={() => showNotice('Продвижение появится позже')}>⚡</button></section>
    </>;
  };

  const renderExplore = () => <>{header('Поиск', true)}<div className="search-box motion-search"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Бренд, категория или город" /></div>{filtered.length ? productGrid(filtered) : <div className="empty-state"><b>Ничего не найдено</b><p>Попробуй другой запрос.</p></div>}</>;

  const renderProduct = () => {
    const product = selectedProduct;
    if (!product) return <>{header('Товар', true)}<div className="empty-state"><b>Товар не найден</b></div></>;
    const images = orderedImages(product);
    return <>{header('Товар', true)}<div className="detail-image-wrap detail-gallery">{images.length > 0 && <img className="detail-image" src={images[photoIndex % images.length]?.url} alt={product.title} />}{images.length > 1 && <div className="photo-tap-zones"><button onClick={() => setPhotoIndex((v) => (v - 1 + images.length) % images.length)} /><button onClick={() => setPhotoIndex((v) => (v + 1) % images.length)} /></div>}<span className="photo-counter">{Math.min(photoIndex + 1, images.length)} / {images.length}</span></div>
      <section className="detail-card motion-pop"><div className="detail-title"><div><b>{product.brand}</b><h1>{product.title}</h1></div><button className="icon-button pressable" onClick={() => toggleLike(product)}><Heart fill={liked.includes(product.id) ? 'currentColor' : 'none'} /></button></div><strong className="detail-price">{formatPrice(product)}</strong>
        <div className="spec-grid"><span><small>Размер</small>{product.size || '—'}</span><span><small>Состояние</small>{product.condition}</span><span><small>Цвет</small>{product.color || '—'}</span><span><small>Город</small>{product.city}</span></div>
        <div className="detail-description"><h3>Описание</h3><p>{product.description}</p>{product.delivery && <><h3>Доставка</h3><p>{product.delivery}</p></>}</div><h3>Продавец</h3>
        <div className="detail-seller"><div className="avatar">{initials(product.seller.display_name || product.seller.username)}</div><div><b>{product.seller.username}{product.seller.is_verified ? ' ✓' : ''}</b><small>{product.seller.city} · ★ {product.seller.rating}</small></div><button onClick={() => openSeller(product)}>Профиль</button></div>
        <button className="primary-button" onClick={() => product.seller_id === profile.id ? showNotice('Это твоё объявление') : openSeller(product)}><MessageCircle size={19} /> Связаться с продавцом</button>
      </section></>;
  };

  const renderProfile = () => <>{header('Профиль', true)}<section className="profile-head motion-header"><div className="avatar large">{initials(profile.display_name || profile.username)}</div><h2>{profile.username}{profile.is_verified ? ' ✓' : ''}</h2><p>{ownLocation}</p>{profile.bio && <small>{profile.bio}</small>}</section>{loadingProducts ? <div className="profile-products-loading">Обновляем объявления…</div> : myProducts.length ? productGrid(myProducts) : <section className="empty-profile-products motion-pop"><div>＋</div><h3>У тебя пока нет объявлений</h3><p>Добавь первую вещь — она появится здесь и в общей ленте.</p><button className="primary-button" onClick={() => navigate('create')}>Добавить товар</button></section>}</>;

  const renderSeller = () => {
    if (!selectedSeller) return <>{header('Продавец', true, () => navigate('product'))}<div className="empty-state"><b>Профиль не найден</b></div></>;
    const sellerLocation = [selectedSeller.city, countryNames[selectedSeller.country_code] || selectedSeller.country_code].filter(Boolean).join(', ');
    return <>{header('Продавец', true, () => navigate('product'))}<section className="seller-profile-hero motion-pop"><div className="seller-avatar-wrap">{selectedSeller.avatar_url ? <img src={selectedSeller.avatar_url} alt={selectedSeller.display_name} /> : <div className="avatar seller-avatar">{initials(selectedSeller.display_name || selectedSeller.username)}</div>}{selectedSeller.is_verified && <span>✓</span>}</div><h1>{selectedSeller.display_name}</h1><b>@{selectedSeller.username}</b><p>{sellerLocation}</p>{selectedSeller.bio && <small>{selectedSeller.bio}</small>}<div className="seller-stats"><span><strong>{sellerProducts.length}</strong>Объявлений</span><span><strong>{selectedSeller.rating}</strong>Рейтинг</span></div><button className="primary-button seller-contact" onClick={() => contactSeller(selectedSeller)}><Phone size={18} /> Связаться</button></section>
      <div className="seller-section-title"><h3>Активные объявления</h3>{sellerLoading && <span>Обновляем…</span>}</div>{sellerProducts.length ? productGrid(sellerProducts) : <div className="empty-state motion-pop"><b>Активных товаров пока нет</b></div>}</>;
  };

  const renderLikes = () => <>{header('Избранное', true)}{favoriteProducts.length ? productGrid(favoriteProducts) : <div className="empty-state motion-pop"><Heart /><b>Избранное пока пустое</b><p>Нажимай сердце или свайпай карточки вправо.</p></div>}</>;
  const renderMessages = () => <>{header('Сообщения', true)}<div className="empty-state"><b>Сообщений пока нет</b><p>Чаты с продавцами появятся здесь.</p></div></>;
  const renderFilters = () => <>{header('Фильтры', true)}<div className="form filters"><label>Категория<select><option>Все категории</option><option>Куртки</option><option>Кроссовки</option><option>Худи</option></select></label><label>Город<input placeholder={profile.city} /></label><button className="primary-button" onClick={() => navigate('feed')}>Показать товары</button></div></>;

  if (screen === 'create') return <main className="app-shell"><CreateProductScreen profile={profile} onBack={() => navigate('profile')} onCreated={(product) => { setMyProducts((items) => [product, ...items]); setFeedProducts((items) => [product, ...items]); setSelectedId(product.id); setFeedIndex(0); showNotice('Товар опубликован'); navigate('profile'); refreshMarketplace().catch(() => undefined); }} /></main>;

  const content = screen === 'feed' ? renderFeed() : screen === 'explore' ? renderExplore() : screen === 'profile' ? renderProfile() : screen === 'seller' ? renderSeller() : screen === 'product' ? renderProduct() : screen === 'likes' ? renderLikes() : screen === 'messages' ? renderMessages() : renderFilters();
  return <main className={`app-shell ${screen === 'feed' ? 'feed-screen' : ''}`}>{notice && <div className="toast">{notice}</div>}<section className="screen-transition">{content}</section><nav className="bottom-nav"><button className={screen === 'feed' ? 'active' : ''} onClick={() => navigate('feed')}><Home /><span>Лента</span></button><button className={screen === 'explore' ? 'active' : ''} onClick={() => navigate('explore')}><Search /><span>Поиск</span></button><button className="create" onClick={() => navigate('create')}><Plus /></button><button className={screen === 'likes' ? 'active' : ''} onClick={() => navigate('likes')}><Heart /><span>Избранное</span></button><button className={screen === 'profile' ? 'active' : ''} onClick={() => navigate('profile')}><User /><span>Профиль</span></button></nav></main>;
}
