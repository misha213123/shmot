type CachedProfile = {
  username?: string | null;
  display_name?: string | null;
  city?: string | null;
  country_code?: string | null;
  bio?: string | null;
  rating?: string | number | null;
};

const countryNames: Record<string, string> = {
  RU: 'Россия',
  BY: 'Беларусь',
  KZ: 'Казахстан',
  UA: 'Украина',
  AM: 'Армения',
  GE: 'Грузия',
};

function readLatestProfile(): CachedProfile | null {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith('driply.profile.'));
    if (!keys.length) return null;
    const raw = localStorage.getItem(keys[keys.length - 1]);
    return raw ? JSON.parse(raw) as CachedProfile : null;
  } catch {
    return null;
  }
}

function ensureMarketRole(profileHead: HTMLElement, profile: CachedProfile): void {
  const screen = profileHead.closest('.screen-transition');
  if (!screen) return;
  let block = screen.querySelector<HTMLElement>('.profile-market-role');
  if (!block) {
    block = document.createElement('section');
    block.className = 'profile-market-role';
    profileHead.insertAdjacentElement('afterend', block);
  }
  const rating = Number(profile.rating || 0);
  block.innerHTML = `<div><b>Покупатель и продавец</b><small>${rating > 0 ? `Рейтинг ${rating.toFixed(1)} · ` : ''}Можно покупать, продавать и принимать предложения цены</small></div><span>DRIPLY USER</span>`;
}

function syncProfileUi(): void {
  const profile = readLatestProfile();
  if (!profile) return;

  const username = profile.username?.trim() || 'Пользователь';
  const displayName = profile.display_name?.trim() || username;
  const city = profile.city?.trim() || '';
  const country = countryNames[profile.country_code || ''] || profile.country_code || '';
  const location = [city, country].filter(Boolean).join(', ');
  const initial = displayName.charAt(0).toLocaleUpperCase('ru') || 'П';

  const profileHead = document.querySelector<HTMLElement>('.profile-head');
  if (profileHead) {
    const avatar = profileHead.querySelector<HTMLElement>('.avatar');
    const title = profileHead.querySelector<HTMLElement>('h2');
    const subtitle = profileHead.querySelector<HTMLElement>('p');

    if (avatar) avatar.textContent = initial;
    if (title) title.textContent = `@${username}`;
    if (subtitle) subtitle.textContent = location;
    ensureMarketRole(profileHead, profile);
  }

  document.querySelectorAll<HTMLElement>('.detail-seller').forEach((seller) => {
    const avatar = seller.querySelector<HTMLElement>('.avatar');
    const name = seller.querySelector<HTMLElement>('b');
    if (avatar) avatar.textContent = initial;
    if (name) name.textContent = `@${username}`;
  });
}

export function enableProfileDomSync(): () => void {
  void import('./navigationRepairRuntime').then(({ enableNavigationRepairRuntime }) => enableNavigationRepairRuntime()).catch(() => undefined);

  let frame = 0;
  const scheduleSync = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(syncProfileUi);
  };

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('storage', scheduleSync);
  scheduleSync();

  return () => {
    observer.disconnect();
    window.removeEventListener('storage', scheduleSync);
    window.cancelAnimationFrame(frame);
  };
}
