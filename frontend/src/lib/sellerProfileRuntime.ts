let enabled = false;
let suppressUntil = 0;

function triggerTextAction(text: string): void {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = text;
  trigger.style.display = 'none';
  document.body.append(trigger);
  trigger.click();
  trigger.remove();
}

function decorateSellerProfile(): void {
  const hero = document.querySelector<HTMLElement>('.seller-profile-hero');
  if (!hero) return;
  hero.classList.add('seller-profile-premium');
  const button = hero.querySelector<HTMLButtonElement>('.seller-contact');
  if (button) {
    button.innerHTML = '<span aria-hidden="true">💬</span> Написать продавцу';
    button.setAttribute('aria-label', 'Написать продавцу');
  }

  if (hero.querySelector('.seller-secondary-actions')) return;
  const actions = document.createElement('div');
  actions.className = 'seller-secondary-actions';

  const follow = document.createElement('button');
  follow.type = 'button';
  follow.className = 'seller-follow-action';
  follow.innerHTML = '<span aria-hidden="true">＋</span> Подписаться';
  follow.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    triggerTextAction('Подписаться');
    follow.classList.toggle('is-following');
    follow.innerHTML = follow.classList.contains('is-following')
      ? '<span aria-hidden="true">✓</span> Вы подписаны'
      : '<span aria-hidden="true">＋</span> Подписаться';
  });

  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'seller-share-action';
  share.innerHTML = '<span aria-hidden="true">↗</span> Поделиться';
  share.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const title = hero.querySelector('h1')?.textContent?.trim() || 'Профиль продавца DRIPLY';
    try {
      if (navigator.share) await navigator.share({ title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        share.innerHTML = '<span aria-hidden="true">✓</span> Ссылка скопирована';
        window.setTimeout(() => { share.innerHTML = '<span aria-hidden="true">↗</span> Поделиться'; }, 1600);
      }
    } catch { /* user cancelled sharing */ }
  });

  actions.append(follow, share);
  button?.insertAdjacentElement('afterend', actions);
}

function handlePointer(event: PointerEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.seller-profile-hero .seller-contact');
  if (!button || Date.now() < suppressUntil) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  suppressUntil = Date.now() + 500;

  const productId = sessionStorage.getItem('driply.active-product-id') || '';
  if (productId) {
    window.dispatchEvent(new CustomEvent('driply:start-chat', { detail: { productId } }));
  } else {
    window.dispatchEvent(new CustomEvent('driply:open-messages'));
  }
}

export function enableSellerProfileRuntime(): void {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  document.addEventListener('pointerup', handlePointer, true);
  const observer = new MutationObserver(decorateSellerProfile);
  observer.observe(document.body, { childList: true, subtree: true });
  decorateSellerProfile();
}
