import { useMemo, useState } from 'react';
import {
  Bell, ChevronLeft, Filter, Heart, Home, MessageCircle, MoreHorizontal,
  Plus, Search, Settings, SlidersHorizontal, User, X
} from 'lucide-react';

type Screen = 'feed' | 'explore' | 'create' | 'likes' | 'profile' | 'product' | 'messages' | 'filters';

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
  const product = products[index % products.length];

  const filtered = useMemo(() => products.filter((item) =>
    `${item.brand} ${item.title} ${item.city}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 1800);
  };

  const next = () => setIndex((value) => (value + 1) % products.length);
  const toggleLike = (id: number) => setLiked((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  const Header = ({ title = 'DRIPLY', back = false }: { title?: string; back?: boolean }) => (
    <header className="topbar">
      <button className="icon-button" onClick={() => back ? setScreen('feed') : showNotice('Уведомлений пока нет')} aria-label={back ? 'Назад' : 'Уведомления'}>
        {back ? <ChevronLeft /> : <Bell size={21} />}
      </button>
      <div className="brand"><strong>{title}</strong>{title === 'DRIPLY' && <span>ЛИСТАЙ. НАХОДИ. НОСИ.</span>}</div>
      <button className="icon-button" onClick={() => setScreen(title === 'Профиль' ? 'profile' : 'filters')} aria-label="Настройки">
        {title === 'Профиль' ? <Settings size={21} /> : <SlidersHorizontal size={21} />}
      </button>
    </header>
  );

  const Feed = () => (
    <>
      <Header />
      <nav className="feed-tabs"><button className="active">Для вас</button><button>Подписки</button><button>Рядом</button></nav>
      <section className="swipe-stage">
        <article className="product-card" onClick={() => setScreen('product')}>
          <img src={product.image} alt={product.title} />
          <div className="product-gradient" />
          <div className="product-copy top-copy"><span className="eyebrow">{product.brand}</span><span>{product.title}</span></div>
          <span className="new-badge">НОВОЕ</span>
          <div className="product-copy bottom-copy"><span>{product.size} · {product.city}</span><strong>{product.price}</strong></div>
          <span className="likes"><Heart size={16} /> {product.likes}</span>
        </article>
      </section>
      <section className="swipe-actions">
        <button className="round secondary" onClick={() => setIndex((value) => (value - 1 + products.length) % products.length)}>↶</button>
        <button className="round secondary" onClick={next}><X /></button>
        <button className="round primary" onClick={() => { toggleLike(product.id); showNotice('Добавлено в избранное'); next(); }}><Heart fill="currentColor" /></button>
        <button className="round secondary" onClick={() => showNotice('Продвижение появится позже')}>⚡</button>
      </section>
    </>
  );

  const ProductScreen = () => (
    <>
      <Header title="Товар" back />
      <img className="detail-image" src={product.image} alt={product.title} />
      <section className="detail-card">
        <div className="detail-title"><div><b>{product.brand}</b><h1>{product.title}</h1></div><button className="icon-button" onClick={() => toggleLike(product.id)}><Heart fill={liked.includes(product.id) ? 'currentColor' : 'none'} /></button></div>
        <strong className="detail-price">{product.price}</strong>
        <div className="spec-grid"><span><small>Размер</small>{product.size}</span><span><small>Состояние</small>{product.condition}</span><span><small>Город</small>{product.city}</span></div>
        <h3>Продавец</h3>
        <div className="seller-row"><div className="avatar">Д</div><div><b>drip.collector</b><small>★ 4.9 · 124 отзыва</small></div><button onClick={() => setScreen('profile')}>Профиль</button></div>
        <h3>Описание</h3><p>Оригинальная вещь в отличном состоянии. Без повреждений. Возможна личная встреча или отправка.</p>
        <button className="primary-button" onClick={() => setScreen('messages')}><MessageCircle size={19} /> Написать продавцу</button>
      </section>
    </>
  );

  const Explore = () => (
    <><Header title="Поиск" back />
      <div className="search-box"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Бренд, категория или город" /><button onClick={() => setScreen('filters')}><Filter size={19} /></button></div>
      <div className="chips"><button>Всё</button><button>Куртки</button><button>Худи</button><button>Кроссовки</button></div>
      <div className="product-grid">{filtered.map((item) => <button key={item.id} className="grid-item" onClick={() => { setIndex(products.findIndex((p) => p.id === item.id)); setScreen('product'); }}><img src={item.image} alt={item.title} /><b>{item.price}</b><span>{item.brand}</span></button>)}</div>
    </>
  );

  const Likes = () => (
    <><Header title="Избранное" back /><div className="product-grid">{products.filter((item) => liked.includes(item.id)).map((item) => <button key={item.id} className="grid-item" onClick={() => { setIndex(products.findIndex((p) => p.id === item.id)); setScreen('product'); }}><img src={item.image} alt={item.title} /><b>{item.price}</b><span>{item.title}</span></button>)}</div>{liked.length === 0 && <div className="empty"><Heart /><h2>Пока пусто</h2><p>Сохраняйте понравившиеся вещи свайпом вправо.</p></div>}</>
  );

  const Create = () => (
    <><Header title="Новое объявление" back /><form className="form" onSubmit={(e) => { e.preventDefault(); showNotice('Черновик сохранён'); setScreen('profile'); }}>
      <button type="button" className="upload">＋<b>Добавить фотографии</b><span>До 10 изображений</span></button>
      <label>Название<input required placeholder="Например, винтажная куртка Nike" /></label>
      <label>Бренд<input required placeholder="Nike" /></label>
      <div className="form-row"><label>Размер<input placeholder="M" /></label><label>Цена<input type="number" placeholder="250" /></label></div>
      <label>Описание<textarea rows={5} placeholder="Состояние, особенности, доставка..." /></label>
      <button className="primary-button" type="submit">Опубликовать</button>
    </form></>
  );

  const Profile = () => (
    <><Header title="Профиль" back /><section className="profile-head"><div className="avatar large">Д</div><h2>drip.collector ✓</h2><p>Варшава, Польша</p><div className="stats"><span><b>28</b>Объявлений</span><span><b>1,2 тыс.</b>Подписчиков</span><span><b>342</b>Подписок</span></div><div className="profile-actions"><button>Редактировать</button><button onClick={() => setScreen('messages')}>Сообщения</button></div></section><h3 className="section-title">Мои товары</h3><div className="product-grid">{products.map((item) => <button key={item.id} className="grid-item" onClick={() => { setIndex(products.findIndex((p) => p.id === item.id)); setScreen('product'); }}><img src={item.image} alt={item.title} /><b>{item.price}</b><span>{item.title}</span></button>)}</div></>
  );

  const Messages = () => (
    <><Header title="Сообщения" back /><div className="message-list">{['drip.collector','sneaker.head','vintage.vibes','street.archive'].map((name, i) => <button key={name}><div className="avatar">{name[0].toUpperCase()}</div><div><b>{name}</b><span>{i === 0 ? 'Куртка ещё в продаже?' : 'Спасибо, договорились 👍'}</span></div><small>{i + 1} ч.</small></button>)}</div></>
  );

  const Filters = () => (
    <><Header title="Фильтры" back /><div className="form filters"><label>Категория<select><option>Все категории</option><option>Куртки</option><option>Худи</option><option>Кроссовки</option></select></label><label>Размер<div className="chips"><button>XS</button><button>S</button><button className="selected">M</button><button>L</button><button>XL</button></div></label><label>Цена до<input type="range" min="0" max="1000" defaultValue="500" /></label><label>Состояние<select><option>Любое</option><option>Новое</option><option>Как новое</option><option>Хорошее</option></select></label><label>Город<select><option>Вся Польша</option><option>Варшава</option><option>Краков</option><option>Вроцлав</option></select></label><button className="primary-button" onClick={() => { showNotice('Фильтры применены'); setScreen('feed'); }}>Показать товары</button></div></>
  );

  const content = screen === 'feed' ? <Feed /> : screen === 'product' ? <ProductScreen /> : screen === 'explore' ? <Explore /> : screen === 'likes' ? <Likes /> : screen === 'create' ? <Create /> : screen === 'profile' ? <Profile /> : screen === 'messages' ? <Messages /> : <Filters />;

  return <main className="app-shell">{notice && <div className="toast">{notice}</div>}{content}<nav className="bottom-nav"><button className={screen === 'feed' ? 'active' : ''} onClick={() => setScreen('feed')}><Home /><span>Лента</span></button><button className={screen === 'explore' ? 'active' : ''} onClick={() => setScreen('explore')}><Search /><span>Поиск</span></button><button className="create" onClick={() => setScreen('create')}><Plus /></button><button className={screen === 'likes' ? 'active' : ''} onClick={() => setScreen('likes')}><Heart /><span>Избранное</span></button><button className={screen === 'profile' ? 'active' : ''} onClick={() => setScreen('profile')}><User /><span>Профиль</span></button></nav></main>;
}
