let enabled = false;

type TouchDrag = {
  card: HTMLElement;
  startX: number;
  startY: number;
  dx: number;
  horizontal: boolean;
};

let drag: TouchDrag | null = null;
let suppressClickUntil = 0;

function getCard(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  // Do not start a card swipe from real interface controls. Photo tap zones are
  // intentionally allowed: on the fullscreen feed they cover most of the image.
  if (target.closest('.swipe-actions, .bottom-nav, .feed-chrome-controls, .topbar, input, textarea, select, a')) {
    return null;
  }

  const stage = target.closest('.feed-screen .swipe-stage, .app-shell:has(.swipe-stage) .swipe-stage');
  if (!stage) return null;

  return stage.querySelector<HTMLElement>('.draggable-card, .product-card');
}

function reset(card: HTMLElement): void {
  card.style.transition = 'transform 180ms ease, opacity 180ms ease';
  card.style.transform = '';
  card.style.opacity = '';
  window.setTimeout(() => {
    card.style.removeProperty('transition');
    card.style.removeProperty('transform');
    card.style.removeProperty('opacity');
  }, 210);
}

function complete(card: HTMLElement, direction: 'left' | 'right'): void {
  const positive = direction === 'right';
  card.style.transition = 'transform 230ms cubic-bezier(.22,.8,.3,1), opacity 230ms ease';
  card.style.transform = `translate3d(${positive ? 125 : -125}%,0,0) rotate(${positive ? 11 : -11}deg)`;
  card.style.opacity = '0';
  suppressClickUntil = performance.now() + 650;

  const action = document.querySelector<HTMLButtonElement>(
    positive ? '.feed-screen .like-action, .like-action' : '.feed-screen .danger-action, .danger-action',
  );
  window.setTimeout(() => action?.click(), 70);
  window.setTimeout(() => reset(card), 340);
}

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length !== 1) return;
  const card = getCard(event.target);
  if (!card) return;
  const touch = event.touches[0];
  drag = { card, startX: touch.clientX, startY: touch.clientY, dx: 0, horizontal: false };
}

function onTouchMove(event: TouchEvent): void {
  if (!drag || event.touches.length !== 1) return;
  const touch = event.touches[0];
  const dx = touch.clientX - drag.startX;
  const dy = touch.clientY - drag.startY;

  if (!drag.horizontal) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    if (Math.abs(dy) > Math.abs(dx) * 1.15) {
      drag = null;
      return;
    }
    drag.horizontal = true;
  }

  event.preventDefault();
  event.stopPropagation();
  drag.dx = dx;
  drag.card.style.transition = 'none';
  drag.card.style.transform = `translate3d(${dx}px,0,0) rotate(${dx / 24}deg)`;
  drag.card.style.opacity = String(Math.max(.7, 1 - Math.abs(dx) / 650));
}

function onTouchEnd(event: TouchEvent): void {
  if (!drag) return;
  const current = drag;
  drag = null;
  if (!current.horizontal) return;

  event.preventDefault();
  event.stopPropagation();
  suppressClickUntil = performance.now() + 500;

  if (current.dx >= 48) complete(current.card, 'right');
  else if (current.dx <= -48) complete(current.card, 'left');
  else reset(current.card);
}

function onClick(event: MouseEvent): void {
  if (performance.now() >= suppressClickUntil) return;
  if (!(event.target instanceof Element) || !event.target.closest('.swipe-stage')) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export function enableIosSwipeRuntime(): () => void {
  if (typeof window === 'undefined' || enabled) return () => undefined;
  enabled = true;
  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
  document.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
  document.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: false });
  document.addEventListener('click', onClick, true);

  return () => {
    enabled = false;
    drag = null;
    document.removeEventListener('touchstart', onTouchStart, true);
    document.removeEventListener('touchmove', onTouchMove, true);
    document.removeEventListener('touchend', onTouchEnd, true);
    document.removeEventListener('touchcancel', onTouchEnd, true);
    document.removeEventListener('click', onClick, true);
  };
}
