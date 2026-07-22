import { Bell, Heart, Home, Plus, Search, SlidersHorizontal, User, X } from 'lucide-react';

const product = {
  brand: 'STONE ISLAND',
  title: 'Crinkle Reps Hooded Jacket Black',
  size: 'L / Large',
  price: '219€',
  image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85',
};

export default function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="icon-button" aria-label="Notifications"><Bell size={21} /></button>
        <div className="brand"><strong>DRIPLY</strong><span>DRIP. SWIPE. FLEX.</span></div>
        <button className="icon-button" aria-label="Filters"><SlidersHorizontal size={21} /></button>
      </header>

      <nav className="feed-tabs" aria-label="Feed type">
        <button className="active">For You</button>
        <button>Following</button>
        <button>Nearby</button>
      </nav>

      <section className="swipe-stage">
        <article className="product-card">
          <img src={product.image} alt={product.title} />
          <div className="product-gradient" />
          <div className="product-copy top-copy">
            <span className="eyebrow">{product.brand}</span>
            <span>{product.title}</span>
          </div>
          <span className="new-badge">NEW</span>
          <div className="product-copy bottom-copy">
            <span>{product.size}</span>
            <strong>{product.price}</strong>
          </div>
          <span className="likes"><Heart size={16} /> 312</span>
        </article>
      </section>

      <section className="swipe-actions" aria-label="Swipe actions">
        <button className="round secondary" aria-label="Undo">↶</button>
        <button className="round secondary" aria-label="Skip"><X /></button>
        <button className="round primary" aria-label="Save"><Heart fill="currentColor" /></button>
        <button className="round secondary" aria-label="Boost">⚡</button>
      </section>

      <nav className="bottom-nav" aria-label="Primary">
        <button className="active"><Home /><span>Feed</span></button>
        <button><Search /><span>Explore</span></button>
        <button className="create"><Plus /></button>
        <button><Heart /><span>Likes</span></button>
        <button><User /><span>Profile</span></button>
      </nav>
    </main>
  );
}
