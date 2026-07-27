let started = false;
let suppressUntil = 0;
let suppressTarget: Element | null = null;

function closest(target: EventTarget | null, selector: string): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(selector) : null;
}

function removeOverlay(selector: string): void {
  document.querySelectorAll(selector).forEach((element) => element.remove());
  document.body.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('overflow');
  document.body.classList.remove('deal-open', 'feed-notifications-open');
}

function closeAllTransientUi(): void {
  removeOverlay('.recommendation-overlay,.deal-overlay,.feed-notification-backdrop');
}

function cleanProfileDom(): void {
  const profile = document.querySelector<HTMLElement>('.profile-head');
  const roles = Array.from(document.querySelectorAll<HTMLElement>('.profile-market-role'));
  const dealEntries = Array.from(document.querySelectorAll<HTMLElement>('.deal-center-button'));
  const recommendationEntries = Array.from(document.querySelectorAll<HTMLElement>('.recommendation-profile-actions'));

  if (!profile) {
    roles.forEach((entry) => entry.remove());
    dealEntries.forEach((entry) => entry.remove());
    recommendationEntries.forEach((entry) => entry.remove());
    return;
  }

  const role = roles[0];
  roles.slice(1).forEach((entry) => entry.remove());
  dealEntries.slice(1).forEach((entry) => entry.remove());
  recommendationEntries.slice(1).forEach((entry) => entry.remove());

  if (role && role.previousElementSibling !== profile) {
    profile.insertAdjacentElement('afterend', role);
  }

  const dealEntry = dealEntries[0];
  const dealAnchor = role || profile;
  if (dealEntry && dealEntry.previousElementSibling !== dealAnchor) {
    dealAnchor.insertAdjacentElement('afterend', dealEntry);
  }

  const recommendationEntry = recommendationEntries[0];
  const recommendationAnchor = dealEntry || role || profile;
  if (recommendationEntry && recommendationEntry.previousElementSibling !== recommendationAnchor) {
    recommendationAnchor.insertAdjacentElement('afterend', recommendationEntry);
  }
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
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    removeOverlay('.recommendation-overlay');
    suppressTarget = recommendationClose;
    suppressUntil = performance.now() + 500;
    return;
  }

  const dealClose = closest(event.target, '.deal-close');
  if (dealClose) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    removeOverlay('.deal-overlay');
    suppressTarget = dealClose;
    suppressUntil = performance.now() + 500;
    return;
  }

  const settings = closest(event.target, '.topbar .icon-button');
  if (settings && isProfileSettings(settings)) triggerFirstTap(settings, event);
}

function onClickCapture(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  if (target && suppressTarget && performance.now() < suppressUntil && (target === suppressTarget || suppressTarget.contains(target))) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }

  if (closest(event.target, '.recommendation-close')) {
    event.preventDefault();
    event.stopPropagation();
    removeOverlay('.recommendation-overlay');
    return;
  }

  if (closest(event.target, '.deal-close')) {
    event.preventDefault();
    event.stopPropagation();
    removeOverlay('.deal-overlay');
    return;
  }

  if (closest(event.target, '.bottom-nav button')) closeAllTransientUi();
}

function installStyles(): void {
  if (document.getElementById('driply-navigation-repair-styles')) return;
  const style = document.createElement('style');
  style.id = 'driply-navigation-repair-styles';
  style.textContent = `
    @media (max-width:600px){
      html,body,#root{
        width:100%!important;
        height:100%!important;
        min-height:100%!important;
        overflow:hidden!important;
      }
      .app-shell{
        position:fixed!important;
        inset:0!important;
        left:50%!important;
        transform:translateX(-50%)!important;
        width:min(100%,430px)!important;
        height:100%!important;
        min-height:100%!important;
        max-height:100%!important;
        padding:0!important;
        overflow:hidden!important;
      }
      .app-shell>.screen-transition{
        position:absolute!important;
        inset:0 0 calc(82px + env(safe-area-inset-bottom)) 0!important;
        width:100%!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        padding:max(16px,env(safe-area-inset-top)) 18px 32px!important;
        overflow-x:hidden!important;
        overflow-y:auto!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior-y:contain!important;
        touch-action:pan-y!important;
        scrollbar-width:none!important;
      }
      .app-shell>.screen-transition::-webkit-scrollbar{display:none!important}
      .app-shell.feed-screen>.screen-transition{
        display:grid!important;
        grid-template-rows:auto auto minmax(0,1fr) auto!important;
        overflow:hidden!important;
        touch-action:none!important;
      }
      .app-shell>.bottom-nav{
        position:absolute!important;
        inset:auto 0 0 0!important;
        width:100%!important;
        max-width:430px!important;
        margin:0!important;
        transform:none!important;
        translate:none!important;
        animation:none!important;
        z-index:2147483000!important;
      }
      .screen-transition:has(.profile-head){padding-bottom:40px!important}
      .screen-transition:has(.profile-head) *:not(button):not(input):not(textarea):not(select){touch-action:pan-y!important}
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
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      cleanProfileDom();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('pointerup', onPointerUp, { capture: true, passive: false });
  document.addEventListener('click', onClickCapture, true);
  schedule();

  return () => {
    started = false;
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('click', onClickCapture, true);
    closeAllTransientUi();
  };
}
