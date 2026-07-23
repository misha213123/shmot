import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import MarketplaceApp from './MarketplaceApp';
import { api, type ApiProfile } from '../lib/api';
import { auth } from '../lib/auth';

const PROFILE_CACHE_PREFIX = 'driply.profile.';

function readCachedProfile(userId: string): ApiProfile | null {
  try {
    const value = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`);
    return value ? JSON.parse(value) as ApiProfile : null;
  } catch {
    return null;
  }
}

export default function AppStable() {
  const [profile, setProfile] = useState<ApiProfile | null>(null);

  useEffect(() => {
    let active = true;
    auth.session().then((session) => {
      if (!active || !session) return;
      const cached = readCachedProfile(session.user.id);
      if (cached) setProfile(cached);
      api.myProfile().then((value) => {
        if (!active) return;
        setProfile(value);
        try {
          localStorage.setItem(`${PROFILE_CACHE_PREFIX}${session.user.id}`, JSON.stringify(value));
        } catch {
          // The live profile still works when local storage is unavailable.
        }
      }).catch(() => undefined);
    });
    return () => { active = false; };
  }, []);

  if (!profile) {
    return <main className="auth-shell auth-loading"><LoaderCircle className="spin" /><b>Открываем DRIPLY</b></main>;
  }

  return <MarketplaceApp profile={profile} />;
}
