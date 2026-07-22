let startY = 0;
let startX = 0;

export function preventPullToRefresh(): () => void {
  const getScroller = () => document.querySelector<HTMLElement>('.app-shell');

  const onTouchStart = (event: TouchEvent) => {
    startY = event.touches[0]?.clientY ?? 0;
    startX = event.touches[0]?.clientX ?? 0;
  };

  const onTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    const scroller = getScroller();
    if (!touch || !scroller) return;

    const deltaY = touch.clientY - startY;
    const deltaX = touch.clientX - startX;
    const isVerticalGesture = Math.abs(deltaY) > Math.abs(deltaX);
    if (!isVerticalGesture) return;

    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    const pullingDown = deltaY > 0;
    const pushingUp = deltaY < 0;

    if ((atTop && pullingDown) || (atBottom && pushingUp)) {
      event.preventDefault();
    }
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });

  return () => {
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
  };
}
