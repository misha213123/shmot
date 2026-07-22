import { type PointerEvent, useMemo, useRef, useState } from 'react';
import {
  Bell, ChevronLeft, Filter, Heart, Home, MessageCircle,
  Plus, Search, Settings, SlidersHorizontal, User, X
} from 'lucide-react';
import '../styles/gestures.css';

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
  image: string;
  likes: number;
};

const products: Product[] = [
  { id: 1, brand: 'STONE ISLAND', title: 'Чёрная куртка с капюшоном', size: 'L', price: '219 €', city: 'Варшава', condition: '9/10', image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85', likes: 312 },
  { id: 2, brand: 'NEW BALANCE', title: 'Кроссовки 530', size: '43', price: '149 €', city: 'Краков', condition: '8/10', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85', likes: 208 },
  { id: 3, brand: 'CARHARTT', title: 'Винтажная рабочая куртка', size: 'M', price: '189 €', city: 'Вроцлав', condition: '9/10', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1000&q=85', likes: 174 },
  { id: 4, brand: 'NIKE', title: 'Худи оверсайз', size: 'XL', price: '89 €', city: 'Варшава', condition: 'Новое', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1000&q=85', likes: 147 },
];

export default function App() {
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
  const noticeTimer = useRef<number | null>(null);
  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const activePointer = useRef<number | null>(null);
  const product = products[index % products.length];

  const filtered = useMemo(() => products.filter((item) =>
    `${item.brand} ${item.title} ${item.city}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  const navigate = (target: Screen) => {
    if (target === screen) return;
    setScreen(target);
    setScreenKey((value) => value + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showNotice = (text: string) => {
    setNotice(text);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 1900);
  };

  const animateCard = (direction: Exclude<SwipeDirection, null>, callback: () => void) => {
    if (swipeDirection) return;
    setSwipeDirection(direction);
    window.setTimeout(() => {
      callback();
      setSwipeDirection(null);
      setDragX(0);
    }, 300);
  };

  const next = () => animateCard('left', () => setIndex((value) => (value + 1) % products.length));
  const previous = () => animateCard('back', () => setIndex((value) => (value - 1 + products.length) % products.length));
  const toggleLike = (id: number) => setLiked((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  const saveCurrent = () => animateCard('right', () => {
    if (!liked.includes(product.id)) toggleLike(product.id);
    showNotice('Добавлено в избранное');
    setIndex((value) => (value + 1) % products.length);
  });

  const onCardPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (swipeDirection) return;
    activePointer.current = event.pointerId;
    dragStartX.current = event.clientX;
    dragMoved.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onCardPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!dragging || activePointer.current !== event.pointerId) return;
    const distance = event.clientX - dragStartX.current;
    if (Math.abs(distance) > 5) dragMoved.current = true;
    setDragX(Math.max(-220, Math.min(220, distance)));
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    if (activePointer.current !== event.pointerId) return;
    setDragging(false);
    activePointer.current = null;
    const threshold = Math.min(105, window.innerWidth * 0.24);
    if (dragX > threshold) {
      setDragX(0);
      saveCurrent();
    } else if (dragX < -threshold) {
      setDragX(0);
      next();
    } else {
      setDragX(0);
    }
  };

  const cardStyle = dragging || dragX !== 0 ? {
    transform: `translate3d(${dragX}px, 0, 0) rotate(${dragX / 22}deg)`,
    transition: dragging ? 'none' : 'transform 260ms cubic-bezier(.22,1,.36,1)',
  } : undefined;

  const Header = ({ title = 'DRIPLY', back = false }: { title?: string; back?: boolean }) => (
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

  const Feed = () => (
    <>
      <Header />
      <nav className="feed-tabs motion-tabs">
        {['Для вас', 'Подписки', 'Рядом'].map((tab) => <button key={tab} className={feedTab === tab ? 'active' : ''} onClick={() => { setFeedTab(tab); showNotice(`Открыта лента «${tab}»`); }}>{tab}</button>)}
      </nav>
      <section className="swipe-stage">
        <div className="card-stack-shadow card-stack-shadow-one" />
        <div className="card-stack-shadow card-stack-shadow-two" />
        <article
          key={product.id}
          className={`product-card card-enter draggable-card ${dragging ? 'is-dragging' : ''} ${swipeDirection ? `swipe-${swipeDirection}` : ''}`}
          style={cardStyle}
          onPointerDown={onCardPointerDown}
          onPointerMove={onCardPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onClick={() => { if (!dragMoved.current) navigate('product'); }}
        >
          <img src={product.image} alt={product.title} draggable={false} />
          <div className="image-shine" />
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
        <button className="round secondary pressable" onClick={previous} aria-label="Вернуть">↶</button>
        <button className="round secondary pressable danger-action" onClick={next} aria-label="Пропустить"><X /></button>
        <button className={`round primary pressable like-action ${liked.includes(product.id) ? 'is-liked' : ''}`} onClick={saveCurrent} aria-label="Сохранить"><Heart fill="currentColor" /></button>
        <button className="round secondary pressable boost-action" onClick={() => showNotice('Продвижение появится позже')} aria-label="Продвижение">⚡</button>
      </section>
      <p className="swipe-hint">Свайп влево — пропустить · вправо — сохранить</p>
    </>
  );

  const ProductScreen = () => (
    <><Header title="Товар" back /><div className="detail-image-wrap"><img className="detail-image" src={product.image} alt={product.title} /><span className="image-counter">1 / 4</span></div><section className="detail-card stagger-group"><div className="detail-title"><div><b>{product.brand}</b><h1>{product.title}</h1></div><button className={`icon-button pressable favorite-toggle ${liked.includes(product.id) ? 'is-liked' : ''}`} onClick={() => { toggleLike(product.id); showNotice(liked.includes(product.id) ? 'Удалено из избранного' : 'Добавлено в избранное'); }}><Heart fill={liked.includes(product.id) ? 'currentColor' : 'none'} /></button></div><strong className="detail-price">{product.price}</strong><div className="spec-grid"><span><small>Размер</small>{product.size}</span><span><small>Состояние</small>{product.condition}</span><span><small>Город</small>{product.city}</span></div><h3>Продавец</h3><div className="seller-row interactive-row"><div className="avatar">Д</div><div><b>drip.collector</b><small>★ 4.9 · 124 отзыва</small></div><button className="pressable" onClick={() => navigate('profile')}>Профиль</button></div><h3>Описание</h3><p>Оригинальная вещь в отличном состоянии. Без повреждений. Возможна личная встреча или отправка.</p><button className="primary-button pressable" onClick={() => navigate('messages')}><MessageCircle size={19} /> Написать продавцу</button></section></>
  );

  const Explore = () => (
    <><Header title="Поиск" back /><div className="search-box motion-search"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Бренд, категория или город" /><button className="pressable" onClick={() => navigate('filters')}><Filter size={19} /></button></div><div className="chips motion-chips"><button className="selected">Всё</button><button>Куртки</button><button>Худи</button><button>Кроссовки</button></div><div className="product-grid stagger-grid">{filtered.map((item) => <button key={item.id} className="grid-item pressable-card" onClick={() => { setIndex(products.findIndex((p) => p.id === item.id)); navigate('product'); }}><div className="grid-image-wrap"><img src={item.image} alt={item.title} /><Heart className={liked.includes(item.id) ? 'grid-heart liked' : 'grid-heart'} size={18} fill={liked.includes(item.id) ? 'currentColor' : 'none'} /></div><b>{item.price}</b><span>{item.brand}</span></button>)}</div></>
  );

  const Likes = () => (
    <><Header title="Избранное" back /><div className="product-grid stagger-grid">{products.filter((item) => liked.includes(item.id)).map((item) => <button key={item.id} className="grid-item pressable-card" onClick={() => { setIndex(products.findIndex((p) => p.id === item.id)); navigate('product'); }}><div className="grid-image-wrap"><img src={item.image} alt={item.title} /><Heart className="grid-heart liked" size={18} fill="currentColor" /></div><b>{item.price}</b><span>{item.title}</span></button>)}</div>{liked.length === 0 && <div className="empty empty-animated"><Heart /><h2>Пока пусто</h2><p>Сохраняйте понравившиеся вещи свайпом вправо.</p></div>}</>
  );

  const Create = () => (
    <><Header title="Новое объявление" back /><form className="form stagger-group" onSubmit={(e) => { e.preventDefault(); showNotice('Объявление сохранено'); navigate('profile'); }}><button type="button" className="upload pressable"><span className="upload-plus">＋</span><b>Добавить фотографии</b><span>До 10 изображений</span></button><label>Название<input required placeholder="Например, винтажная куртка Nike" /></label><label>Бренд<input required placeholder="Nike" /></label><div className="form-row"><label>Размер<input placeholder="M" /></label><label>Цена<input type="number" placeholder="250" /></label></div><label>Описание<textarea rows={5} placeholder="Состояние, особенности, доставка..." /></label><button className="primary-button pressable" type="submit">Опубликовать</button></form></>
  );

  const Profile = () => (
    <><Header title="Профиль" back /><section className="profile-head profile-enter"><div className="avatar large avatar-pulse">Д</div><h2>drip.collector ✓</h2><p>Варшава, Польша</p><div className="stats"><span><b>28</b>Объявлений</span><span><b>1,2 тыс.</b>Подписчиков</span><span><b>342</b>Подписок</span></div><div className="profile-actions"><button className="pressable">Редактировать</button><button className="pressable" onClick={() => navigate('messages')}>Сообщения</button></div></section><h3 className="section-title">Мои товары</h3><div className="product-grid stagger-grid">{products.map((item) => <button key={item.id} className="grid-item pressable-card" onClick={() => { setIndex(products.findIndex((p) => p.id === item.id)); navigate('product'); }}><img src={item.image} alt={item.title} /><b>{item.price}</b><span>{item.title}</span></button>)}</div></>
  );

  const Messages = () => (
    <><Header title="Сообщения" back /><div className="message-list stagger-group">{['drip.collector','sneaker.head','vintage.vibes','street.archive'].map((name, i) => <button className="interactive-row pressable" key={name}><div className="avatar">{name[0].toUpperCase()}</div><div><b>{name}</b><span>{i === 0 ? 'Куртка ещё в продаже?' : 'Спасибо, договорились 👍'}</span></div><small>{i + 1} ч.</small>{i === 0 && <i className="unread-dot" />}</button>)}</div></>
  );

  const Filters = () => (
    <><Header title="Фильтры" back /><div className="form filters stagger-group"><label>Категория<select><option>Все категории</option><option>Куртки</option><option>Худи</option><option>Кроссовки</option></select></label><label>Размер<div className="chips"><button>XS</button><button>S</button><button className="selected">M</button><button>L</button><button>XL</button></div></label><label>Цена до<input type="range" min="0" max="1000" defaultValue="500" /></label><label>Состояние<select><option>Любое</option><option>Новое</option><option>Как новое</option><option>Хорошее</option></select></label><label>Город<select><option>Вся Польша</option><option>Варшава</option><option>Краков</option><option>Вроцлав</option></select></label><button className="primary-button pressable" onClick={() => { showNotice('Фильтры применены'); navigate('feed'); }}>Показать товары</button></div></>
  );

  const content = screen === 'feed' ? <Feed /> : screen === 'product' ? <ProductScreen /> : screen === 'explore' ? <Explore /> : screen === 'likes' ? <Likes /> : screen === 'create' ? <Create /> : screen === 'profile' ? <Profile /> : screen === 'messages' ? <Messages /> : <Filters />;

  return <main className="app-shell">{notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}</div>}<section key={screenKey} className="screen-transition">{content}</section><nav className="bottom-nav"><button className={`pressable ${screen === 'feed' ? 'active' : ''}`} onClick={() => navigate('feed')}><Home /><span>Лента</span></button><button className={`pressable ${screen === 'explore' ? 'active' : ''}`} onClick={() => navigate('explore')}><Search /><span>Поиск</span></button><button className="create pressable create-pulse" onClick={() => navigate('create')}><Plus /></button><button className={`pressable ${screen === 'likes' ? 'active' : ''}`} onClick={() => navigate('likes')}><Heart fill={screen === 'likes' ? 'currentColor' : 'none'} /><span>Избранное</span></button><button className={`pressable ${screen === 'profile' ? 'active' : ''}`} onClick={() => navigate('profile')}><User /><span>Профиль</span></button></nav></main>;
}
