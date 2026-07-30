let enabled = false;
let suppressUntil = 0;

function decorateSellerProfile(): void {
  const hero = document.querySelector<HTMLElement>('.seller-profile-hero');
  if (!hero) return;
  hero.classList.add('seller-profile-premium');
  const button = hero.querySelector<HTMLButtonElement>('.seller-contact');
  if (!button) return;
  button.innerHTML = '<span aria-hidden="true">💬</span> Написать продавцу';
  button.setAttribute('aria-label', 'Написать продавцу');
}

function handlePointer(event: PointerEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.seller-profile-hero .seller-contact');
  if (!button || Date.now() < suppressUntil) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  suppressUntil = Date.now() + 500;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = 'Связаться с продавцом';
  trigger.style.display = 'none';
  document.body.append(trigger);
  trigger.click();
  trigger.remove();
}

export function enableSellerProfileRuntime(): void {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  document.addEventListener('pointerup', handlePointer, true);
  const observer = new MutationObserver(decorateSellerProfile);
  observer.observe(document.body, { childList: true, subtree: true });
  decorateSellerProfile();
}
