let started = false;
let suppressUntil = 0;
let suppressTarget: Element | null = null;

function closest(target: EventTarget | null, selector: string): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(selector) : null;
}

function hasOpenOverlay(): boolean {
  return Boolean(document.querySelector('.recommendation-overlay,.deal-overlay,.feed-notification-backdrop'));
}

function restoreDocumentScroll(): void {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  if (!shell || shell.classList.contains('feed-screen') || hasOpenOverlay()) return;

  document.documentElement.classList.remove('deal-open');
  document.body.classList.remove('deal-open', 'feed-notifications-open');

  document.documentElement.style.setProperty('height', 'auto', 'important');
  document.documentElement.style.setProperty('min-height', '100%', 'important');
  document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
  document.documentElement.style.setProperty('overflow-y', 'auto', 'important');

  document.body.style.setProperty('height', 'auto', 'important');
  document.body.style.setProperty('min-height', '100%', 'important');
  document.body.style.setProperty('overflow-x', 'hidden', 'important');
  document.body.style.setProperty('overflow-y', 'auto', 'important');
  document.body.style.setProperty('touch-action', 'pan-y', 'important');
}

function removeOverlay(selector: string): void {
  document.querySelectorAll(selector).forEach((element) => element.remove());
  document.body.classList.remove('deal-open', 'feed-notifications-open');
  document.documentElement.classList.remove('deal-open');
  restoreDocumentScroll();
}

function closeAllTransientUi(): void {
  removeOverlay('.recommendation-overlay,.deal-overlay,.feed-notification-backdrop');
}

function cleanProfileDom(): void {
  const profile = document.querySelector<HTMLElement>('.profile-head');
  const groups = [
    Array.from(document.querySelectorAll<HTMLElement>('.profile-market-role')),
    Array.from(document.querySelectorAll<HTMLElement>('.deal-center-button')),
    Array.from(document.querySelectorAll<HTMLElement>('.recommendation-profile-actions')),
  ];

  if (!profile) {
    groups.flat().forEach((entry) => entry.remove());
    restoreDocumentScroll();
    return;
  }

  const keepFirst = (entries: HTMLElement[]) => {
    entries.slice(1).forEach((entry) => entry.remove());
    return entries[0];
  };

  const role = keepFirst(groups[0]);
  const dealEntry = keepFirst(groups[1]);
  const recommendationEntry = keepFirst(groups[2]);

  if (role && role.previousElementSibling !== profile) profile.insertAdjacentElement('afterend', role);
  const dealAnchor = role || profile;
  if (dealEntry && dealEntry.previousElementSibling !== dealAnchor) dealAnchor.insertAdjacentElement('afterend', dealEntry);
  const recommendationAnchor = dealEntry || role || profile;
  if (recommendationEntry && recommendationEntry.previousElementSibling !== recommendationAnchor) recommendationAnchor.insertAdjacentElement('afterend', recommendationEntry);

  restoreDocumentScroll();
}

function isProfileSettings(button: HTMLElement): boolean {
  if (!document.querySelector('.profile-head')) return false;
  const topbar = button.closest('.topbar');
  return Boolean(topbar && button === topbar.querySelector('.icon-button:last-child'));
}

function triggerFirstTap(button: HTMLElement, event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  button.click();
  suppressTarget = button;
  suppressUntil = performance.now() + 550;
}

function onPointerUp(event: PointerEvent): void {
  const recommendationClose = closest(event.target, '.recommendation-close');
  if (recommendationClose) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    removeOverlay('.recommendation-overlay');
    suppressTarget = recommendationClose; suppressUntil = performance.now() + 500;
    return;
  }
  const dealClose = closest(event.target, '.deal-close');
  if (dealClose) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    removeOverlay('.deal-overlay');
    suppressTarget = dealClose; suppressUntil = performance.now() + 500;
    return;
  }
  const settings = closest(event.target, '.topbar .icon-button');
  if (settings && isProfileSettings(settings)) triggerFirstTap(settings, event);
}

function onClickCapture(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  if (target && suppressTarget && performance.now() < suppressUntil && (target === suppressTarget || suppressTarget.contains(target))) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); return;
  }
  if (closest(event.target, '.recommendation-close')) { event.preventDefault(); event.stopPropagation(); removeOverlay('.recommendation-overlay'); return; }
  if (closest(event.target, '.deal-close')) { event.preventDefault(); event.stopPropagation(); removeOverlay('.deal-overlay'); return; }
  if (closest(event.target, '.bottom-nav button')) closeAllTransientUi();
}

function installStyles(): void {
  if (document.getElementById('driply-navigation-repair-styles')) return;
  const style = document.createElement('style');
  style.id = 'driply-navigation-repair-styles';
  style.textContent = `
    @media (max-width:600px){
      html,body,#root{width:100%!important;height:auto!important;min-height:100%!important;overflow-x:hidden!important}
      body{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important}
      #root{overflow:visible!important}

      .app-shell:not(.feed-screen){
        position:relative!important;inset:auto!important;left:auto!important;
        width:min(100%,430px)!important;height:auto!important;min-height:100svh!important;max-height:none!important;
        margin:0 auto!important;padding:max(16px,env(safe-area-inset-top)) 18px calc(118px + env(safe-area-inset-bottom))!important;
        overflow:visible!important;transform:none!important;translate:none!important;contain:none!important;touch-action:pan-y!important;
      }
      .app-shell:not(.feed-screen)>.screen-transition{
        position:relative!important;inset:auto!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;
        padding:0!important;overflow:visible!important;transform:none!important;touch-action:pan-y!important;
      }
      .app-shell:not(.feed-screen)>.screen-transition *:not(button):not(input):not(textarea):not(select){touch-action:pan-y!important}
      .app-shell>.bottom-nav{
        position:fixed!important;top:auto!important;right:auto!important;bottom:0!important;left:50%!important;
        inset:auto auto 0 50%!important;width:min(100%,430px)!important;max-width:430px!important;margin:0!important;
        transform:translate3d(-50%,0,0)!important;translate:none!important;animation:none!important;z-index:2147483000!important;
      }
      .screen-transition:has(.profile-head){padding-bottom:16px!important}
    }
    .profile-market-role{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:14px 16px;border:1px solid #e3dfd8;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(17,17,17,.04)}
    .profile-market-role div{display:grid;gap:3px}.profile-market-role b{font-size:14px}.profile-market-role small{color:#77736d;font-size:12px}.profile-market-role span{padding:8px 11px;border-radius:999px;background:#111;color:#fff;font-size:11px;font-weight:850;white-space:nowrap}
    .profile-market-role~.profile-market-role,.deal-center-button~.deal-center-button,.recommendation-profile-actions~.recommendation-profile-actions{display:none!important}
    .recommendation-close,.deal-close,.feed-notification-close{touch-action:manipulation!important;pointer-events:auto!important;z-index:20!important}
  `;
  document.head.append(style);
}

export function enableNavigationRepairRuntime(): () => void {
  if (typeof window === 'undefined' || started) return () => undefined;
  started = true;
  installStyles();

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => { frame = 0; cleanProfileDom(); });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('pointerup', onPointerUp, { capture: true, passive: false });
  document.addEventListener('click', onClickCapture, true);
  window.addEventListener('pageshow', restoreDocumentScroll);
  window.addEventListener('focus', restoreDocumentScroll);
  schedule();

  return () => {
    started = false;
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('click', onClickCapture, true);
    window.removeEventListener('pageshow', restoreDocumentScroll);
    window.removeEventListener('focus', restoreDocumentScroll);
    closeAllTransientUi();
  };
}
