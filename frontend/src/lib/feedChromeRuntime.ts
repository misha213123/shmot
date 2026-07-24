let started = false;

function isFeedVisible(): boolean {
  return Boolean(document.querySelector('.swipe-stage .product-card'));
}

function openNotifications(): void {
  const existing = document.querySelector<HTMLButtonElement>('[aria-label*="уведом" i], .notification-button, .bell-button');
  if (existing && !existing.classList.contains('feed-notification-control')) {
    existing.click();
    return;
  }

  window.dispatchEvent(new CustomEvent('driply:open-notifications'));
}

function openCurrentProduct(): void {
  const card = document.querySelector<HTMLElement>('.swipe-stage .product-card');
  if (!card) return;
  card.click();
}

function ensureControls(): void {
  const existing = document.querySelector('.feed-chrome-controls');

  if (!isFeedVisible()) {
    existing?.remove();
    return;
  }

  if (existing) return;

  const controls = document.createElement('div');
  controls.className = 'feed-chrome-controls';
  controls.innerHTML = `
    <button type="button" class="feed-notification-control" aria-label="Уведомления">
      <span aria-hidden="true">♡</span>
    </button>
    <button type="button" class="feed-open-product-control" aria-label="Открыть карточку товара">
      <span aria-hidden="true">↗</span>
    </button>
  `;

  controls.querySelector<HTMLButtonElement>('.feed-notification-control')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openNotifications();
  });

  controls.querySelector<HTMLButtonElement>('.feed-open-product-control')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openCurrentProduct();
  });

  document.body.append(controls);
}

export function enableFeedChromeRuntime(): () => void {
  if (typeof window === 'undefined' || started) return () => undefined;
  started = true;

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      ensureControls();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();

  return () => {
    started = false;
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    document.querySelector('.feed-chrome-controls')?.remove();
  };
}
