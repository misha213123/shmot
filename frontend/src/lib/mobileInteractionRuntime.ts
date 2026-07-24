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
    handler.call(button, event as MouseEvent);
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

export function enableMobileInteractionRuntime(): () => void {
  if (typeof window === 'undefined' || started) return () => undefined;
  started = true;

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
  document.addEventListener('pointerup', onPointerEnd, { capture: true, passive: false });
  document.addEventListener('pointercancel', onPointerEnd, { capture: true, passive: false });
  document.addEventListener('pointerup', onPointerUpCapture, { capture: true, passive: false });
  document.addEventListener('click', onClickCapture, true);

  return () => {
    started = false;
    drag = null;
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerEnd, true);
    document.removeEventListener('pointercancel', onPointerEnd, true);
    document.removeEventListener('pointerup', onPointerUpCapture, true);
    document.removeEventListener('click', onClickCapture, true);
  };
}
