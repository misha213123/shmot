let started = false;

function isFeedVisible(): boolean {
  const app = document.querySelector('.app-shell');
  return Boolean(app?.classList.contains('feed-screen') && app.querySelector('.swipe-stage .product-card'));
}

function closePanel(): void {
  document.querySelector('.feed-notification-backdrop')?.remove();
  document.body.classList.remove('feed-notifications-open');
}

function openChat(): void {
  closePanel();
  const topbarButton = document.querySelector<HTMLButtonElement>('.feed-screen .topbar button:first-child, .topbar button:first-child');
  if (topbarButton) {
    topbarButton.click();
    return;
  }
  window.dispatchEvent(new CustomEvent('driply:open-chats'));
}

function openNotifications(): void {
  closePanel();
  const backdrop = document.createElement('div');
  backdrop.className = 'feed-notification-backdrop';
  backdrop.innerHTML = `
    <section class="feed-notification-panel" role="dialog" aria-modal="true" aria-label="Уведомления">
      <header>
        <div><small>DRIPLY</small><strong>Уведомления</strong></div>
        <button type="button" class="feed-notification-close" aria-label="Закрыть">×</button>
      </header>
      <button type="button" class="feed-chat-entry">
        <span class="feed-chat-icon" aria-hidden="true">💬</span>
        <span><strong>Сообщения</strong><small>Открыть диалоги с продавцами и покупателями</small></span>
        <b aria-hidden="true">›</b>
      </button>
      <div class="feed-notification-empty">
        <span aria-hidden="true">🔔</span>
        <strong>Новых уведомлений нет</strong>
        <p>Здесь появятся лайки, предложения цены, сделки и обновления заказов.</p>
      </div>
    </section>
  `;
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closePanel();
  });
  backdrop.querySelector('.feed-notification-close')?.addEventListener('click', closePanel);
  backdrop.querySelector('.feed-chat-entry')?.addEventListener('click', openChat);
  document.body.append(backdrop);
  document.body.classList.add('feed-notifications-open');
}

function openCurrentProduct(): void {
  const card = document.querySelector<HTMLElement>('.app-shell.feed-screen .swipe-stage .product-card');
  if (!card) return;
  card.click();
}

function installStyles(): void {
  if (document.getElementById('feed-chrome-runtime-styles')) return;
  const style = document.createElement('style');
  style.id = 'feed-chrome-runtime-styles';
  style.textContent = `
    .feed-chrome-controls{position:fixed;z-index:60;top:max(18px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(100%,430px);pointer-events:none}
    .feed-chrome-controls button{position:absolute;top:0;width:46px;height:46px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.28);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.2);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);pointer-events:auto}
    .feed-notification-control{left:14px}.feed-open-product-control{right:14px}
    .feed-chrome-controls svg{width:25px;height:25px;stroke:currentColor;fill:none;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
    .feed-open-product-control svg{width:23px;height:23px}
    .feed-notification-backdrop{position:fixed;inset:0;z-index:150;background:rgba(0,0,0,.46);display:flex;align-items:flex-end;animation:feedFade .18s ease}
    .feed-notification-panel{width:min(100%,430px);max-height:78dvh;margin:0 auto;background:#f8f6f2;color:#111;border-radius:30px 30px 0 0;padding:24px 20px calc(26px + env(safe-area-inset-bottom));box-shadow:0 -20px 50px rgba(0,0,0,.2);animation:feedSheet .26s cubic-bezier(.22,.8,.3,1)}
    .feed-notification-panel header{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}.feed-notification-panel header div{display:grid;gap:3px}.feed-notification-panel header small{font-weight:900;letter-spacing:.18em}.feed-notification-panel header strong{font-size:30px;line-height:1}
    .feed-notification-close{width:48px;height:48px;border:0;border-radius:50%;background:#e9e6df;font-size:34px;line-height:1}
    .feed-chat-entry{width:100%;border:0;border-radius:22px;padding:16px;background:#111;color:#fff;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;text-align:left}.feed-chat-icon{width:46px;height:46px;border-radius:16px;background:#fff;color:#111;display:grid;place-items:center;font-size:22px}.feed-chat-entry span:nth-child(2){display:grid;gap:4px}.feed-chat-entry strong{font-size:18px}.feed-chat-entry small{color:#bdbdbd;line-height:1.25}.feed-chat-entry b{font-size:30px;font-weight:400}
    .feed-notification-empty{text-align:center;padding:40px 18px 18px;color:#777}.feed-notification-empty>span{display:block;font-size:38px;margin-bottom:12px}.feed-notification-empty strong{display:block;color:#111;font-size:20px;margin-bottom:8px}.feed-notification-empty p{margin:0;line-height:1.45}
    @keyframes feedFade{from{opacity:0}to{opacity:1}}@keyframes feedSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
  `;
  document.head.append(style);
}

function ensureControls(): void {
  const existing = document.querySelector('.feed-chrome-controls');
  if (!isFeedVisible()) {
    existing?.remove();
    closePanel();
    return;
  }
  if (existing) return;

  const controls = document.createElement('div');
  controls.className = 'feed-chrome-controls';
  controls.innerHTML = `
    <button type="button" class="feed-notification-control" aria-label="Уведомления">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>
    </button>
    <button type="button" class="feed-open-product-control" aria-label="Открыть карточку товара">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path></svg>
    </button>
  `;
  controls.querySelector('.feed-notification-control')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openNotifications();
  });
  controls.querySelector('.feed-open-product-control')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openCurrentProduct();
  });
  document.body.append(controls);
}

export function enableFeedChromeRuntime(): () => void {
  if (typeof window === 'undefined' || started) return () => undefined;
  started = true;
  installStyles();

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      ensureControls();
    });
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  schedule();

  return () => {
    started = false;
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    document.querySelector('.feed-chrome-controls')?.remove();
    closePanel();
  };
}
