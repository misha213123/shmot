import '../styles/empty-feed.css';

let enabled = false;

function upgradeEmptyFeed(): void {
  const shell = document.querySelector<HTMLElement>('.app-shell.feed-screen');
  if (!shell) return;
  const state = shell.querySelector<HTMLElement>('.empty-state');
  if (!state || state.dataset.emptyFeedUpgraded === '1') return;

  const text = state.textContent || '';
  if (!/В ленте пока нет товаров/i.test(text)) return;

  state.dataset.emptyFeedUpgraded = '1';
  state.classList.add('empty-feed-premium');
  const button = state.querySelector<HTMLButtonElement>('button');
  if (button) {
    button.textContent = 'Добавить первое объявление';
    button.classList.add('empty-feed-create');
  }

  const title = state.querySelector('b');
  if (title) title.textContent = 'Лента скоро оживёт';
  const copy = state.querySelector('p');
  if (copy) copy.textContent = 'Пока здесь нет товаров других продавцов. Размести своё объявление — его уже увидят другие пользователи.';

  const visual = document.createElement('div');
  visual.className = 'empty-feed-visual';
  visual.innerHTML = '<span>DRIPLY</span><i></i><i></i><i></i>';
  state.prepend(visual);
}

export function enableEmptyFeedRuntime(): void {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  const observer = new MutationObserver(upgradeEmptyFeed);
  observer.observe(document.body, { childList: true, subtree: true });
  upgradeEmptyFeed();
}
