import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, Heart, Home, MessageCircle, Plus, Search, Settings, SlidersHorizontal, User, X } from 'lucide-react';

import CreateProductScreen from './CreateProductScreen';
import { api, type ApiProduct, type ApiProfile } from '../lib/api';
import '../styles/gestures.css';
import '../styles/stability.css';
import '../styles/gallery.css';

type Screen = 'feed' | 'explore' | 'create' | 'likes' | 'profile' | 'product' | 'messages' | 'filters';

type Props = {
  profile: ApiProfile;
};

const countryNames: Record<string, string> = {
  RU: 'Россия', BY: 'Беларусь', KZ: 'Казахстан', UA: 'Украина', AM: 'Армения', GE: 'Грузия',
};

const currencySymbols: Record<string, string> = {
  RUB: '₽', BYN: 'Br', KZT: '₸', UAH: '₴', AMD: '֏', GEL: '₾',
};

const demoProducts: ApiProduct[] = [
  {
    id: 'demo-1', seller_id: 'demo', title: 'Чёрная куртка с капюшоном', brand: 'STONE ISLAND', category: 'Куртки',
    description: 'Оригинальная куртка в отличном состоянии. Возможна отправка или личная встреча.', size: 'L', color: 'Чёрный', condition: '9/10',
    price: '21900', currency: 'RUB', country_code: 'RU', city: 'Москва', delivery: null, status: 'active', views_count: 0, favorites_count: 312,
    created_at: new Date().toISOString(), images: [
      { id: 'd1', url: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85', position: 0, is_cover: true },
      { id: 'd2', url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1200&q=85', position: 1, is_cover: false },
    ], seller: { id: 'demo', username: 'drip.collector', display_name: 'DRIP', avatar_url: null, city: 'Москва', country_code: 'RU', is_verified: true, rating: '4.9' },
  },
  {
    id: 'demo-2', seller_id: 'demo', title: 'Кроссовки 530', brand: 'NEW BALANCE', category: 'Кроссовки',
    description: 'Кроссовки в хорошем состоянии, коробка в комплекте.', size: '43', color: 'Красный', condition: '8/10',
    price: '14900', currency: 'RUB', country_code: 'RU', city: 'Санкт-Петербург', delivery: null, status: 'active', views_count: 0, favorites_count: 208,
    created_at: new Date().toISOString(), images: [{ id: 'd3', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85', position: 0, is_cover: true }],
    seller: { id: 'demo', username: 'sneaker.head', display_name: 'Sneaker Head', avatar_url: null, city: 'Санкт-Петербург', country_code: 'RU', is_verified: true, rating: '4.8' },
  },
];

function formatPrice(product: ApiProduct) {
  const value = Number(product.price);
  const formatted = Number.isFinite(value) ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) : product.price;
  return `${formatted} ${currencySymbols[product.currency] || product.currency}`;
}

function cover(product: ApiProduct) {
  return [...product.images].sort((a, b) => a.position - b.position)[0]?.url || '';
}

export default function MarketplaceApp({ profile }: Props) {
  const [screen, setScreen] = useState<Screen>('feed');
  const [feedProducts, setFeedProducts] = useState<ApiProduct[]>(demoProducts);
  const [myProducts, setMyProducts] = useState<ApiProduct[]>([]);
  const [selectedId, setSelectedId] = useState(demoProducts[0].id);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.products(), api.myProducts()]).then(([feedResult, mineResult]) => {
      if (!active) return;
      if (feedResult.status === 'fulfilled' && feedResult.value.items.length) setFeedProducts(feedResult.value.items);
      if (mineResult.status === 'fulfilled') setMyProducts(mineResult.value.items);
      setLoadingProducts(false);
    });
    return () => { active = false; };
  }, []);

  const selectedProduct = useMemo(() => {
    return [...myProducts, ...feedProducts].find((item) => item.id === selectedId) || feedProducts[0];
  }, [feedProducts, myProducts, selectedId]);

  const filtered = useMemo(() => feedProducts.filter((item) =>
    `${item.brand} ${item.title} ${item.city}`.toLowerCase().includes(query.toLowerCase())
  ), [feedProducts, query]);

  const initials = (profile.display_name || profile.username || 'U').trim().slice(0, 1).toUpperCase();
  const location = [profile.city, countryNames[profile.country_code] || profile.country_code].filter(Boolean).join(', ');

  const navigate = (next: Screen) => {
    setScreen(next);
    setPhotoIndex(0);
    document.querySelector('.app-shell')?.scrollTo({ top: 0, behavior: 'auto' });
  };

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 1800);
  };

  const openProduct = (product: ApiProduct) => {
    setSelectedId(product.id);
    setPhotoIndex(0);
    navigate('product');
    if (!product.id.startsWith('demo-')) api.recordView(product.id).catch(() => undefined);
  };

  const toggleLike = (product: ApiProduct) => {
    setLiked((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]);
    if (!product.id.startsWith('demo-')) api.addFavorite(product.id).catch(() => undefined);
  };

  const header = (title = 'DRIPLY', back = false) => (
    <header className="topbar motion-header">
      <button className="icon-button pressable" onClick={() => back ? navigate('feed') : showNotice('Уведомлений пока нет')}>
        {back ? <ChevronLeft /> : <Bell size={21} />}
      </button>
      <div className="brand"><strong>{title}</strong>{title === 'DRIPLY' && <span>ЛИСТАЙ. НАХОДИ. НОСИ.</span>}</div>
      <button className="icon-button pressable" onClick={() => title === 'Профиль' ? showNotice('Настройки профиля появятся следующим этапом') : navigate('filters')}>
        {title === 'Профиль' ? <Settings size={21} /> : <SlidersHorizontal size={21} />}
      </button>
    </header>
  );

  const renderFeed = () => {
    const product = selectedProduct || feedProducts[0];
    if (!product) return <>{header()}<div className="empty-state"><b>Пока нет товаров</b></div></>;
    const images = [...product.images].sort((a, b) => a.position - b.position);
    const activeImage = images[photoIndex % Math.max(images.length, 1)];
    return <>
      {header()}
      <nav className="feed-tabs motion-tabs"><button className="active">Для вас</button><button>Подписки</button><button>Рядом</button></nav>
      <section className="swipe-stage">
        <div className="card-stack-shadow card-stack-shadow-one" />
        <div className="card-stack-shadow card-stack-shadow-two" />
        <article className="product-card draggable-card" onClick={() => openProduct(product)}>
          {activeImage && <img src={activeImage.url} alt={product.title} draggable={false} />}
          <div className="photo-tap-zones">
            <button type="button" onClick={(event) => { event.stopPropagation(); setPhotoIndex((value) => (value - 1 + images.length) % images.length); }} />
            <button type="button" onClick={(event) => { event.stopPropagation(); setPhotoIndex((value) => (value + 1) % images.length); }} />
          </div>
          <div className="product-gradient" />
          <div className="product-copy top-copy"><span className="eyebrow">{product.brand}</span><span>{product.title}</span></div>
          <span className="new-badge">НОВОЕ</span>
          <div className="product-copy bottom-copy"><span>{product.size || '—'} · {product.city}</span><strong>{formatPrice(product)}</strong></div>
          <span className="likes"><Heart size={16} /> {product.favorites_count}</span>
        </article>
      </section>
      <section className="swipe-actions motion-actions">
        <button className="round secondary pressable" onClick={() => showNotice('Возврат к прошлому товару')}>↶</button>
        <button className="round secondary pressable danger-action" onClick={() => { const next = (feedProducts.findIndex((item) => item.id === product.id) + 1) % feedProducts.length; setSelectedId(feedProducts[next].id); setPhotoIndex(0); }}><X /></button>
        <button className={`round primary pressable like-action ${liked.includes(product.id) ? 'is-liked' : ''}`} onClick={() => toggleLike(product)}><Heart fill="currentColor" /></button>
        <button className="round secondary pressable boost-action" onClick={() => showNotice('Продвижение появится позже')}>⚡</button>
      </section>
    </>;
  };

  const renderExplore = () => <>
    {header('Поиск', true)}
    <div className="search-box motion-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Бренд, категория или город" /></div>
    <div className="product-grid">{filtered.map((item) => <button key={item.id} className="grid-item pressable-card" onClick={() => openProduct(item)}><img src={cover(item)} alt={item.title} /><b>{formatPrice(item)}</b><span>{item.title}</span></button>)}</div>
  </>;

  const renderProduct = () => {
    const product = selectedProduct;
    if (!product) return null;
    const images = [...product.images].sort((a, b) => a.position - b.position);
    return <>
      {header('Товар', true)}
      <div className="detail-image-wrap detail-gallery">
        <img className="detail-image" src={images[photoIndex % images.length]?.url} alt={product.title} />
        <div className="photo-tap-zones"><button onClick={() => setPhotoIndex((value) => (value - 1 + images.length) % images.length)} /><button onClick={() => setPhotoIndex((value) => (value + 1) % images.length)} /></div>
        <span className="photo-counter">{photoIndex + 1} / {images.length}</span>
      </div>
      <section className="detail-card">
        <div className="detail-title"><div><b>{product.brand}</b><h1>{product.title}</h1></div><button className="icon-button" onClick={() => toggleLike(product)}><Heart fill={liked.includes(product.id) ? 'currentColor' : 'none'} /></button></div>
        <strong className="detail-price">{formatPrice(product)}</strong>
        <div className="spec-grid"><span><small>Размер</small>{product.size || '—'}</span><span><small>Состояние</small>{product.condition}</span><span><small>Цвет</small>{product.color || '—'}</span><span><small>Город</small>{product.city}</span></div>
        <div className="detail-description"><h3>Описание</h3><p>{product.description}</p></div>
        <h3>Продавец</h3>
        <div className="detail-seller"><div className="avatar">{product.seller.display_name.slice(0, 1).toUpperCase()}</div><div><b>{product.seller.username}</b><small>★ {product.seller.rating}</small></div><button onClick={() => product.seller_id === profile.id ? navigate('profile') : showNotice('Публичный профиль продавца будет следующим этапом')}>Профиль</button></div>
        <button className="primary-button" onClick={() => navigate('messages')}><MessageCircle size={19} /> Написать продавцу</button>
      </section>
    </>;
  };

  const renderProfile = () => <>
    {header('Профиль', true)}
    <section className="profile-head motion-header">
      <div className="avatar large">{initials}</div>
      <h2>{profile.username}{profile.is_verified ? ' ✓' : ''}</h2>
      <p>{location}</p>
      {profile.bio && <small>{profile.bio}</small>}
    </section>
    {loadingProducts ? <div className="profile-products-loading">Обновляем объявления…</div> : myProducts.length ? (
      <div className="product-grid">{myProducts.map((item) => <button key={item.id} className="grid-item pressable-card motion-pop" onClick={() => openProduct(item)}><img src={cover(item)} alt={item.title} /><b>{formatPrice(item)}</b><span>{item.title}</span></button>)}</div>
    ) : (
      <section className="empty-profile-products motion-pop"><div>＋</div><h3>У тебя пока нет объявлений</h3><p>Добавь первую вещь — она появится здесь и в общей ленте.</p><button className="primary-button" onClick={() => navigate('create')}>Добавить товар</button></section>
    )}
  </>;

  const renderLikes = () => <>{header('Избранное', true)}<div className="product-grid">{feedProducts.filter((item) => liked.includes(item.id)).map((item) => <button key={item.id} className="grid-item" onClick={() => openProduct(item)}><img src={cover(item)} alt={item.title} /><b>{formatPrice(item)}</b><span>{item.title}</span></button>)}</div></>;
  const renderMessages = () => <>{header('Сообщения', true)}<div className="empty-state"><b>Сообщений пока нет</b><p>Чаты с продавцами появятся здесь.</p></div></>;
  const renderFilters = () => <>{header('Фильтры', true)}<div className="form filters"><label>Категория<select><option>Все категории</option><option>Куртки</option><option>Кроссовки</option></select></label><label>Город<input placeholder={profile.city} /></label><button className="primary-button" onClick={() => navigate('feed')}>Показать товары</button></div></>;

  if (screen === 'create') return <main className="app-shell"><CreateProductScreen profile={profile} onBack={() => navigate('profile')} onCreated={(product) => { setMyProducts((items) => [product, ...items]); setFeedProducts((items) => [product, ...items]); setSelectedId(product.id); showNotice('Товар опубликован'); navigate('profile'); }} /></main>;

  const content = screen === 'feed' ? renderFeed() : screen === 'explore' ? renderExplore() : screen === 'profile' ? renderProfile() : screen === 'product' ? renderProduct() : screen === 'likes' ? renderLikes() : screen === 'messages' ? renderMessages() : renderFilters();

  return <main className={`app-shell ${screen === 'feed' ? 'feed-screen' : ''}`}>
    {notice && <div className="toast">{notice}</div>}
    <section className="screen-transition">{content}</section>
    <nav className="bottom-nav">
      <button className={screen === 'feed' ? 'active' : ''} onClick={() => navigate('feed')}><Home /><span>Лента</span></button>
      <button className={screen === 'explore' ? 'active' : ''} onClick={() => navigate('explore')}><Search /><span>Поиск</span></button>
      <button className="create" onClick={() => navigate('create')}><Plus /></button>
      <button className={screen === 'likes' ? 'active' : ''} onClick={() => navigate('likes')}><Heart /><span>Избранное</span></button>
      <button className={screen === 'profile' ? 'active' : ''} onClick={() => navigate('profile')}><User /><span>Профиль</span></button>
    </nav>
  </main>;
}
