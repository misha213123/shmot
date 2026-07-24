let started = false;
let suppressClickUntil = 0;

type DragState = {
  card: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  dragging: boolean;
};

let drag: DragState | null = null;

function closestElement(target: EventTarget | null, selector: string): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(selector) : null;
}

function closeDealOverlay(event?: Event): void {
  event?.preventDefault();
  event?.stopPropagation();
  if ('stopImmediatePropagation' in (event || {})) event?.stopImmediatePropagation();
  document.querySelectorAll('.deal-overlay').forEach((overlay) => overlay.remove());
  document.documentElement.classList.remove('deal-open');
  document.body.style.removeProperty('overflow');
}

function openDealFromFirstTap(button: HTMLElement, event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const handler = (button as HTMLButtonElement).onclick;
  if (typeof handler === 'function') {
    const safeHandler = handler as unknown as (this: HTMLButtonElement, event: Event) => unknown;
    safeHandler.call(button as HTMLButtonElement, event);
  } else {
    window.setTimeout(() => button.click(), 0);
  }

  suppressClickUntil = performance.now() + 500;
}

function resetCard(card: HTMLElement): void {
  card.style.transition = 'transform 180ms ease, opacity 180ms ease';
  card.style.transform = '';
  card.style.opacity = '';
  window.setTimeout(() => {
    card.style.removeProperty('transition');
    card.style.removeProperty('transform');
    card.style.removeProperty('opacity');
  }, 200);
}

function finishSwipe(direction: 'left' | 'right'): void {
  if (!drag) return;
  const { card } = drag;
  card.style.transition = 'transform 220ms ease, opacity 220ms ease';
  card.style.transform = `translate3d(${direction === 'right' ? 125 : -125}%, 0, 0) rotate(${direction === 'right' ? 12 : -12}deg)`;
  card.style.opacity = '0';

  const actionSelector = direction === 'right' ? '.like-action' : '.danger-action';
  const action = document.querySelector<HTMLButtonElement>(actionSelector);
  suppressClickUntil = performance.now() + 600;
  window.setTimeout(() => action?.click(), 80);
  window.setTimeout(() => resetCard(card), 340);
}

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const card = closestElement(event.target, '.draggable-card');
  if (!card || closestElement(event.target, 'button')) return;

  drag = {
    card,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    currentX: 0,
    dragging: false,
  };

  try { card.setPointerCapture(event.pointerId); } catch { /* Safari may reject capture */ }
}

function onPointerMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;

  if (!drag.dragging && Math.abs(dx) < 8) return;
  if (!drag.dragging && Math.abs(dy) > Math.abs(dx)) {
    drag = null;
    return;
  }

  drag.dragging = true;
  drag.currentX = dx;
  event.preventDefault();
  drag.card.style.transition = 'none';
  drag.card.style.transform = `translate3d(${dx}px, 0, 0) rotate(${dx / 22}deg)`;
  drag.card.style.opacity = String(Math.max(0.72, 1 - Math.abs(dx) / 700));
}

function onPointerEnd(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const state = drag;
  drag = null;

  if (!state.dragging) return;
  event.preventDefault();
  event.stopPropagation();
  suppressClickUntil = performance.now() + 450;

  if (state.currentX >= 65) finishSwipeWithState(state, 'right');
  else if (state.currentX <= -65) finishSwipeWithState(state, 'left');
  else resetCard(state.card);
}

function finishSwipeWithState(state: DragState, direction: 'left' | 'right'): void {
  drag = state;
  finishSwipe(direction);
  drag = null;
}

function onPointerUpCapture(event: PointerEvent): void {
  const close = closestElement(event.target, '.deal-close');
  if (close) {
    closeDealOverlay(event);
    suppressClickUntil = performance.now() + 500;
    return;
  }

  const dealButton = closestElement(event.target, '.deal-center-button');
  if (dealButton) openDealFromFirstTap(dealButton, event);
}

function onClickCapture(event: MouseEvent): void {
  const close = closestElement(event.target, '.deal-close');
  if (close) {
    closeDealOverlay(event);
    return;
  }

  if (performance.now() < suppressClickUntil) {
    const card = closestElement(event.target, '.draggable-card');
    const dealButton = closestElement(event.target, '.deal-center-button');
    if (card || dealButton) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }
}

function installFullscreenFeedStyles(): void {
  if (document.getElementById('driply-fullscreen-feed')) return;
  const style = document.createElement('style');
  style.id = 'driply-fullscreen-feed';
  style.textContent = `
    .app-shell.feed-screen{width:min(100%,430px);height:100dvh;min-height:100dvh;padding:0 0 calc(72px + env(safe-area-inset-bottom));background:#090909;color:#fff;overflow:hidden}
    .feed-screen .screen-transition{position:relative;height:calc(100dvh - 72px - env(safe-area-inset-bottom));min-height:0;overflow:hidden}
    .feed-screen .topbar{position:fixed;z-index:20;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(100%,430px);display:grid;grid-template-columns:1fr;padding:0 18px;pointer-events:none;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.45)}
    .feed-screen .topbar .brand strong{font-size:25px;color:#fff}
    .feed-screen .topbar .brand span,.feed-screen .topbar .icon-button{display:none!important}
    .feed-screen .feed-tabs{display:none!important}
    .feed-screen .swipe-stage{position:absolute!important;inset:0!important;width:100%!important;height:auto!important;min-height:0!important;display:block!important;overflow:hidden!important;background:#111}
    .feed-screen .card-stack-shadow{display:none!important}
    .feed-screen .product-card{position:absolute!important;inset:0!important;z-index:1;width:100%!important;height:100%!important;min-height:100%!important;aspect-ratio:auto!important;border-radius:0!important;box-shadow:none!important;background:#111!important;display:block!important;overflow:hidden!important;touch-action:pan-y}
    .feed-screen .product-card>img{position:absolute!important;inset:0!important;z-index:0;width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;opacity:1!important}
    .feed-screen .product-gradient{z-index:1;background:linear-gradient(to bottom,rgba(0,0,0,.24),transparent 28%,transparent 54%,rgba(0,0,0,.78))}
    .feed-screen .product-copy,.feed-screen .new-badge,.feed-screen .likes,.feed-screen .photo-progress,.feed-screen .photo-tap-zones{z-index:3}
    .feed-screen .top-copy{top:76px;left:20px}
    .feed-screen .bottom-copy{left:20px;bottom:30px;max-width:72%}
    .feed-screen .bottom-copy strong{font-size:38px}
    .feed-screen .new-badge{top:76px;right:18px}
    .feed-screen .likes{right:20px;bottom:30px}
    .feed-screen .swipe-actions{position:fixed!important;right:max(14px,calc((100vw - 430px)/2 + 14px))!important;bottom:calc(88px + env(safe-area-inset-bottom))!important;z-index:25!important;display:flex!important;flex-direction:column-reverse!important;gap:12px!important;margin:0!important;align-items:center!important;width:auto!important}
    .feed-screen .swipe-actions .round{width:50px;height:50px;background:rgba(20,20,20,.56);color:#fff;border:1px solid rgba(255,255,255,.22);box-shadow:0 7px 20px rgba(0,0,0,.28);backdrop-filter:blur(14px)}
    .feed-screen .swipe-actions .round.primary{width:58px;height:58px;background:#fff;color:#111}
    .feed-screen .bottom-nav{background:linear-gradient(to top,rgba(0,0,0,.94),rgba(0,0,0,.35));border-top:0;color:#fff;backdrop-filter:none}
    .feed-screen .bottom-nav button{color:rgba(255,255,255,.72)}
    .feed-screen .bottom-nav button.active{color:#fff}
    .feed-screen .bottom-nav button.active:before{background:#fff}
    .feed-screen .bottom-nav .create{background:#fff;color:#111}
    @media (max-height:720px){.feed-screen .swipe-actions{bottom:calc(72px + env(safe-area-inset-bottom))!important}.feed-screen .top-copy,.feed-screen .new-badge{top:62px}.feed-screen .bottom-copy,.feed-screen .likes{bottom:20px}}
  `;
  document.head.append(style);
}

function syncScreenLayout(): void {
  const title = document.querySelector<HTMLElement>('.topbar .brand strong')?.textContent?.trim() || '';
  const isProfile = title === 'Профиль';
  document.querySelectorAll<HTMLElement>('.topbar .icon-button').forEach((button) => {
    button.style.display = isProfile ? '' : 'none';
  });

  if (!document.querySelector('.profile-head')) {
    document.querySelectorAll('.recommendation-profile-actions,.deal-center-button').forEach((element) => element.remove());
  }
}

export function enableMobileInteractionRuntime(): () => void {
  if (typeof window === 'undefined' || started) return () => undefined;
  started = true;
  installFullscreenFeedStyles();

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
  document.addEventListener('pointerup', onPointerEnd, { capture: true, passive: false });
  document.addEventListener('pointercancel', onPointerEnd, { capture: true, passive: false });
  document.addEventListener('pointerup', onPointerUpCapture, { capture: true, passive: false });
  document.addEventListener('click', onClickCapture, true);

  let layoutFrame = 0;
  const scheduleLayout = () => {
    if (layoutFrame) return;
    layoutFrame = window.requestAnimationFrame(() => {
      layoutFrame = 0;
      syncScreenLayout();
    });
  };
  const layoutObserver = new MutationObserver(scheduleLayout);
  layoutObserver.observe(document.body, { childList: true, subtree: true });
  scheduleLayout();

  return () => {
    started = false;
    drag = null;
    layoutObserver.disconnect();
    if (layoutFrame) window.cancelAnimationFrame(layoutFrame);
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerEnd, true);
    document.removeEventListener('pointercancel', onPointerEnd, true);
    document.removeEventListener('pointerup', onPointerUpCapture, true);
    document.removeEventListener('click', onClickCapture, true);
  };
}
