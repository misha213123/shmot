let started = false;

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

function finishSwipe(state: DragState, direction: 'left' | 'right'): void {
  state.card.style.transition = 'transform 220ms ease, opacity 220ms ease';
  state.card.style.transform = `translate3d(${direction === 'right' ? 125 : -125}%, 0, 0) rotate(${direction === 'right' ? 12 : -12}deg)`;
  state.card.style.opacity = '0';

  const selector = direction === 'right' ? '.like-action' : '.danger-action';
  const action = document.querySelector<HTMLButtonElement>(selector);
  window.setTimeout(() => action?.click(), 80);
  window.setTimeout(() => resetCard(state.card), 340);
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

  if (state.currentX >= 65) finishSwipe(state, 'right');
  else if (state.currentX <= -65) finishSwipe(state, 'left');
  else resetCard(state.card);
}

export function enableMobileInteractionRuntime(): () => void {
  if (typeof window === 'undefined' || started) return () => undefined;
  started = true;

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
  document.addEventListener('pointerup', onPointerEnd, { capture: true, passive: false });
  document.addEventListener('pointercancel', onPointerEnd, { capture: true, passive: false });

  return () => {
    started = false;
    drag = null;
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerEnd, true);
    document.removeEventListener('pointercancel', onPointerEnd, true);
  };
}
