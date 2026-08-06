import { useEffect, useState } from 'react';
import { Heart, Home, Plus, Search, ShieldCheck, User } from 'lucide-react';

import { API_URL } from '../../lib/api';
import { auth } from '../../lib/auth';

export type MainScreen = 'feed' | 'explore' | 'create' | 'likes' | 'profile';

type Props = {
  activeScreen: MainScreen;
  onNavigate: (screen: MainScreen) => void;
};

type AdminAccess = { is_admin: boolean };

const ADMIN_CACHE_KEY = 'driply.admin-access.v1';

function readCachedAdminAccess(): boolean {
  try {
    const value = JSON.parse(localStorage.getItem(ADMIN_CACHE_KEY) || 'null') as { isAdmin?: boolean } | null;
    return Boolean(value?.isAdmin);
  } catch {
    return false;
  }
}

function cacheAdminAccess(isAdmin: boolean): void {
  try {
    localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ isAdmin, savedAt: Date.now() }));
  } catch {
    // Storage can be unavailable in private browsing; navigation still works.
  }
}

export default function BottomNavigation({ activeScreen, onNavigate }: Props) {
  const [isAdmin, setIsAdmin] = useState(readCachedAdminAccess);

  useEffect(() => {
    let cancelled = false;

    const verifyAdminAccess = async () => {
      const token = await auth.accessToken();
      if (!token || cancelled) return;

      const response = await fetch(`${API_URL}/api/v1/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok || cancelled) return;

      const access = await response.json() as AdminAccess;
      if (cancelled) return;
      setIsAdmin(access.is_admin);
      cacheAdminAccess(access.is_admin);
    };

    void verifyAdminAccess().catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  return (
    <nav className={`bottom-nav ${isAdmin ? 'has-admin-nav' : ''}`} aria-label="Основная навигация">
      <button type="button" className={activeScreen === 'feed' ? 'active' : ''} aria-current={activeScreen === 'feed' ? 'page' : undefined} onClick={() => onNavigate('feed')}><Home /><span>Лента</span></button>
      <button type="button" className={activeScreen === 'explore' ? 'active' : ''} aria-current={activeScreen === 'explore' ? 'page' : undefined} onClick={() => onNavigate('explore')}><Search /><span>Поиск</span></button>
      <button type="button" className="create" aria-label="Добавить товар" onClick={() => onNavigate('create')}><Plus /></button>
      <button type="button" className={activeScreen === 'likes' ? 'active' : ''} aria-current={activeScreen === 'likes' ? 'page' : undefined} onClick={() => onNavigate('likes')}><Heart /><span>Избранное</span></button>
      <button type="button" className={activeScreen === 'profile' ? 'active' : ''} aria-current={activeScreen === 'profile' ? 'page' : undefined} onClick={() => onNavigate('profile')}><User /><span>Профиль</span></button>
      {isAdmin && <button type="button" className="admin-nav-button" aria-label="Админ-панель" onClick={() => { window.location.href = '/admin'; }}><ShieldCheck /><span>Админ</span></button>}
    </nav>
  );
}
