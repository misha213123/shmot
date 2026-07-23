import { type PointerEvent, useMemo, useRef, useState } from 'react';
import {
  Bell, ChevronLeft, Filter, Heart, Home, MessageCircle,
  Plus, Search, Settings, SlidersHorizontal, User, X
} from 'lucide-react';
import '../styles/gestures.css';
import '../styles/stability.css';
import '../styles/gallery.css';

type Screen = 'feed' | 'explore' | 'create' | 'likes' | 'profile' | 'product' | 'messages' | 'filters';
type SwipeDirection = 'left' | 'right' | 'back' | null;

type Product = {
  id: number;
  brand: string;
  title: string;
  size: string;
  price: string;
  city: string;
  condition: string;
  color: string;
  description: string;
  images: string[];
  likes: number;
};

const products: Product[] = [
  {
    id: 1,
    brand: 'STONE ISLAND',
    title: 'Чёрная куртка с капюшоном',
    size: 'L',
    price: '21 900 ₽',
    city: 'Москва',
    condition: '9/10',
    color: 'Чёрный',
    description: 'Оригинальная куртка в отличном состоянии. Без дыр и пятен. Все молнии и кнопки работают. Возможна отправка или личная встреча.',
    images: [
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85'
    ],
    likes: 312,
  },
  {
    id: 2,
    brand: 'NEW BALANCE',
    title: 'Кроссовки 530',
    size: '43',
    price: '14 900 ₽',
    city: 'Санкт-Петербург',
    condition: '8/10',
    color: 'Белый',
    description: 'Кроссовки в хорошем состоянии. Носились аккуратно. Коробка в комплекте.',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=85'
    ],
    likes: 208,
  },
  {
    id: 3,
    brand: 'CARHARTT',
    title: 'Винтажная рабочая куртка',
    size: 'M',
    price: '18 900 ₽',
    city: 'Минск',
    condition: '9/10',
    color: 'Коричневый',
    description: 'Плотная винтажная куртка. Состояние очень хорошее, посадка свободная.',
    images: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85'
    ],
    likes: 174,
  },
  {
    id: 4,
    brand: 'NIKE',
    title: 'Худи оверсайз',
    size: 'XL',
    price: '8 900 ₽',
    city: 'Москва',
    condition: 'Новое',
    color: 'Серый',
    description: 'Новое худи свободного кроя. Мягкий плотный материал, бирки на месте.',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=85'
    ],
    likes: 147,
  },
];

export default function AppStable() {
  const [screen, setScreen] = useState<Screen>('feed');
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<number[]>([2]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [feedTab, setFeedTab] = useState('Для вас');
  const [screenKey, setScreenKey] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [feedPhotoIndex, setFeedPhotoIndex] = useState(0);
  const [detailPhotoIndex, setDetailPhotoIndex] = useState(0);

  const noticeTimer = useRef<number | null>(null);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragMoved = useRef(false);
  const horizontalDrag = useRef(false);
  const activePointer = useRef<number | null>(null);

  const product = products[index % products.length];
  const filtered = useMemo(() => products.filter((item) =>
    `${item.brand} ${item.title} ${item.city}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  const navigate = (target: Screen) => {
    if (target === screen) return;
    setScreen(target);
    setScreenKey((value) => value + 1);
    if (target === 'product') setDetailPhotoIndex(feedPhotoIndex);
    document.querySelector('.app-shell')?.scrollTo({ top: 0, behavior: 'auto' });
  };

  const showNotice = (text: string) => {
    setNotice(text);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 1700);
  };

  const toggleLike = (id: number) => setLiked((items) =>
    items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
  );

  const animateCard = (direction: Exclude<SwipeDirection, null>, callback: () => void) => {
    if (swipeDirection) return;
    setSwipeDirection(direction);
    window.setTimeout(() => {
      callback();
      setSwipeDirection(null);
      setDragX(0);
      setFeedPhotoIndex(0);
      setDetailPhotoIndex(0);
    }, 260);
  };

  const next = () => animateCard('left', () => setIndex((value) => (value + 1) % products.length));
  const previous = () => animateCard('back', () => setIndex((value) => (value - 1 + products.length) % products.length));
  const saveCurrent = () => animateCard('right', () => {
    setLiked((items) => items.includes(product.id) ? items : [...items, product.id]);
    showNotice('Добавлено в избранное');
    setIndex((value) => (value + 1) % products.length);
  });

  const onCardPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (swipeDirection) return;
    activePointer.current = event.pointerId;
    dragStartX.current = event.clientX;
    dragStartY.current = event.clientY;
    dragMoved.current = false;
    horizontalDrag.current = false;
    setDragging(true);
  };

  const onCardPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!dragging || activePointer.current !== event.pointerId) return;
    const dx = event.clientX - dragStartX.current;
    const dy = event.clientY - dragStartY.current;

    if (!horizontalDrag.current && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    if (!horizontalDrag.current && Math.abs(dy) > Math.abs(dx)) {
      setDragging(false);
      activePointer.current = null;
      return;
    }

    horizontalDrag.current = true;
    dragMoved.current = true;
    event.preventDefault();
    setDragX(Math.max(-220, Math.min(220, dx)));
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    if (activePointer.current !== event.pointerId) return;
    setDragging(false);
    activePointer.current = null;
    const currentX = dragX;
    setDragX(0);
    const threshold = Math.min(95, window.innerWidth * 0.22);
    if (currentX > threshold) saveCurrent();
    else if (currentX < -threshold) next();
  };

  const cardStyle = dragX !== 0 ? {
    transform: `translate3d(${dragX}px,0,0) rotate(${dragX / 24}deg)`,
    transition: dragging ? 'none' : 'transform 220ms cubic-bezier(.22,1,.36,1)',
  } : undefined;

  const changePhoto = (direction: 'prev' | 'next', detail = false) => {
    const current = detail ? detailPhotoIndex : feedPhotoIndex;
    const setCurrent = detail ? setDetailPhotoIndex : setFeedPhotoIndex;
    const count = product.images.length;
    setCurrent(direction === 'next' ? (current + 1) % count : (current - 1 + count) % count);
  };

  const progress = (active: number) => (
    <div className="photo-progress" aria-hidden="true">
      {product.images.map((_, imageIndex) => <span key={imageIndex} className={imageIndex <= active ? (imageIndex === active ? 'active' : 'past') : ''} />)}
    </div>
  );

  const tapZones = (detail = false) => (
    <div className="photo-tap-zones">
      <button type="button" aria-label="Предыдущее фото" onClick={(event) => { event.stopPropagation(); changePhoto('prev', detail); }} />
      <button type="button" aria-label="Следующее фото" onClick={(event) => { event.stopPropagation(); changePhoto('next', detail); }} />
    </div>
  );

  const header = (title = 'DRIPLY', back = false) => (
    <header className="topbar motion-header">
      <button className="icon-button pressable" onClick={() => back ? navigate('feed') : showNotice('Уведомлений пока нет')} aria-label={back ? 'Назад' : 'Уведомления'}>
        {back ? <ChevronLeft /> : <Bell size={21} />}
      </button>
      <div className="brand"><strong>{title}</strong>{title === 'DRIPLY' && <span>ЛИСТАЙ. НАХОДИ. НОСИ.</span>}</div>
      <button className="icon-button pressable" onClick={() => navigate(title === 'Профиль' ? 'profile' : 'filters')} aria-label="Настройки">
        {title === 'Профиль' ? <Settings size={21} /> : <SlidersHorizontal size={21} />}
      </button>
    </header>
  );

  const renderFeed = () => <>
    {header()}
    <nav className="feed-tabs motion-tabs">
      {['Для вас', 'Подписки', 'Рядом'].map((tab) => <button key={tab} className={feedTab === tab ? 'active' : ''} onClick={() => setFeedTab(tab)}>{tab}</button>)}
    </nav>
    <section className="swipe-stage">
      <div className="card-stack-shadow card-stack-shadow-one" />
      <div className="card-stack-shadow card-stack-shadow-two" />
      <article
        key={product.id}
        className={`product-card draggable-card ${dragging ? 'is-dragging' : ''} ${swipeDirection ? `swipe-${swipeDirection}` : ''}`}
        style={cardStyle}
        onPointerDown={onCardPointerDown}
        onPointerMove={onCardPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={() => { if (!dragMoved.current) navigate('product'); }}
      >
        <img src={product.images[feedPhotoIndex]} alt={product.title} draggable={false} />
        {progress(feedPhotoIndex)}
        {tapZones(false)}
        <div className="product-gradient" />
        <div className="product-copy top-copy"><span className="eyebrow">{product.brand}</span><span>{product.title}</span></div>
        <span className="new-badge">НОВОЕ</span>
        <div className="product-copy bottom-copy"><span>{product.size} · {product.city}</span><strong>{product.price}</strong></div>
        <span className="likes"><Heart size={16} /> {product.likes}</span>
        <div className="swipe-stamp stamp-like live-stamp" style={{ opacity: Math.max(0, Math.min(1, dragX / 90)) }}>В ИЗБРАННОЕ</div>
        <div className="swipe-stamp stamp-skip live-stamp" style={{ opacity: Math.max(0, Math.min(1, -dragX / 90)) }}>ПРОПУСТИТЬ</div>
      </article>
    </section>
    <section className="swipe-actions motion-actions">
      <button className="round secondary pressable" onClick={previous}>↶</button>
      <button className="round secondary pressable danger-action" onClick={next}><X /></button>
      <button className={`round primary pressable like-action ${liked.includes(product.id) ? 'is-liked' : ''}`} onClick={saveCurrent}><Heart fill="currentColor" /></button>
      <button className="round secondary pressable boost-action" onClick={() => showNotice('Продвижение появится позже')}>⚡</button>
    </section>
  </>;

  const renderExplore = () => <>
    {header('Поиск', true)}
    <div className="search-box motion-search"><Search size={19} /><input autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Бренд, категория или город" /><button className="pressable" onClick={() => navigate('filters')}><Filter size={19} /></button></div>
    <div className="chips motion-chips"><button className="selected">Всё</button><button>Куртки</button><button>Худи</button><button>Кроссовки</button></div>
    <div className="product-grid">{filtered.map((item) => <button key={item.id} className="grid-item pressable-card" onClick={() => { setIndex(products.findIndex((p) => p.id === item.id)); setFeedPhotoIndex(0); navigate('product'); }}><div className="grid-image-wrap"><img src={item.images[0]} alt={item.title} /></div><b>{item.price}</b><span>{item.brand}</span></button>)}</div>
  </>;

  const renderProduct = () => <>
    {header('Товар', true)}
    <div className="detail-image-wrap detail-gallery">
      <img className="detail-image" src={product.images[detailPhotoIndex]} alt={product.title} />
      {progress(detailPhotoIndex)}
      {tapZones(true)}
      <span className="photo-counter">{detailPhotoIndex + 1} / {product.images.length}</span>
    </div>
    <section className="detail-card">
      <div className="detail-title">
        <div><b>{product.brand}</b><h1>{product.title}</h1></div>
        <button className="icon-button" onClick={() => toggleLike(product.id)}><Heart fill={liked.includes(product.id) ? 'currentColor' : 'none'} /></button>
      </div>
      <strong className="detail-price">{product.price}</strong>
      <div className="spec-grid">
        <span><small>Размер</small>{product.size}</span>
        <span><small>Состояние</small>{product.condition}</span>
        <span><small>Цвет</small>{product.color}</span>
        <span><small>Город</small>{product.city}</span>
      </div>
      <div className="detail-description"><h3>Описание</h3><p>{product.description}</p></div>
      <h3>Продавец</h3>
      <div className="detail-seller"><div className="avatar">Д</div><div><b>drip.collector</b><small>★ 4.9 · 124 отзыва</small></div><button onClick={() => navigate('profile')}>Профиль</button></div>
      <button className="primary-button" onClick={() => navigate('messages')}><MessageCircle size={19} /> Написать продавцу</button>
    </section>
  </>;

  const renderLikes = () => <>{header('Избранное', true)}<div className="product-grid">{products.filter((item) => liked.includes(item.id)).map((item) => <button key={item.id} className="grid-item" onClick={() => { setIndex(products.findIndex((p) => p.id === item.id)); setFeedPhotoIndex(0); navigate('product'); }}><img src={item.images[0]} alt={item.title} /><b>{item.price}</b><span>{item.title}</span></button>)}</div></>;
  const renderCreate = () => <>{header('Новое объявление', true)}<form className="form" onSubmit={(e) => { e.preventDefault(); showNotice('Объявление сохранено'); navigate('profile'); }}><button type="button" className="upload">＋<b>Добавить до 10 фотографий</b></button><label>Название<input required /></label><label>Бренд<input required /></label><div className="form-row"><label>Размер<input /></label><label>Цена<input type="number" /></label></div><label>Описание<textarea rows={5} /></label><button className="primary-button" type="submit">Опубликовать</button></form></>;
  const renderProfile = () => <>{header('Профиль', true)}<section className="profile-head"><div className="avatar large">Д</div><h2>drip.collector ✓</h2><p>Москва, Россия</p></section><div className="product-grid">{products.map((item) => <button key={item.id} className="grid-item"><img src={item.images[0]} alt={item.title} /><b>{item.price}</b><span>{item.title}</span></button>)}</div></>;
  const renderMessages = () => <>{header('Сообщения', true)}<div className="message-list">{['drip.collector','sneaker.head','vintage.vibes'].map((name) => <button key={name}><div className="avatar">{name[0].toUpperCase()}</div><div><b>{name}</b><span>Куртка ещё в продаже?</span></div></button>)}</div></>;
  const renderFilters = () => <>{header('Фильтры', true)}<div className="form filters"><label>Категория<select><option>Все категории</option><option>Куртки</option></select></label><label>Город<select><option>Вся Россия</option><option>Москва</option><option>Санкт-Петербург</option><option>Минск</option></select></label><button className="primary-button" onClick={() => navigate('feed')}>Показать товары</button></div></>;

  const content = screen === 'feed' ? renderFeed() : screen === 'explore' ? renderExplore() : screen === 'product' ? renderProduct() : screen === 'likes' ? renderLikes() : screen === 'create' ? renderCreate() : screen === 'profile' ? renderProfile() : screen === 'messages' ? renderMessages() : renderFilters();

  return <main className={`app-shell ${screen === 'feed' ? 'feed-screen' : ''}`}>
    {notice && <div className="toast">{notice}</div>}
    <section key={screenKey} className="screen-transition">{content}</section>
    <nav className="bottom-nav">
      <button className={screen === 'feed' ? 'active' : ''} onClick={() => navigate('feed')}><Home /><span>Лента</span></button>
      <button className={screen === 'explore' ? 'active' : ''} onClick={() => navigate('explore')}><Search /><span>Поиск</span></button>
      <button className="create" onClick={() => navigate('create')}><Plus /></button>
      <button className={screen === 'likes' ? 'active' : ''} onClick={() => navigate('likes')}><Heart /><span>Избранное</span></button>
      <button className={screen === 'profile' ? 'active' : ''} onClick={() => navigate('profile')}><User /><span>Профиль</span></button>
    </nav>
  </main>;
}
