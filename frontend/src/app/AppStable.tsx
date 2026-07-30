import { useEffect, useState } from 'react';

import EditProfileScreen from './EditProfileScreen';
import MarketplaceApp from './MarketplaceApp';
import { api, type ApiProfile } from '../lib/api';
import { auth } from '../lib/auth';

type Props = {
  profile: ApiProfile;
};

const PROFILE_CACHE_PREFIX = 'driply.profile.v2.';

function cacheProfile(userId: string, value: ApiProfile) {
  try {
    localStorage.setItem(`${PROFILE_CACHE_PREFIX}${userId}`, JSON.stringify(value));
  } catch {
    // The live profile still works when local storage is unavailable.
  }
}

export default function AppStable({ profile: initialProfile }: Props) {
  const [profile, setProfile] = useState<ApiProfile>(initialProfile);
  const [userId, setUserId] = useState(initialProfile.id);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
    setUserId(initialProfile.id);
  }, [initialProfile]);

  useEffect(() => {
    let active = true;

    auth.session().then((session) => {
      if (!active || !session) return;
      setUserId(session.user.id);

      api.myProfile().then((value) => {
        if (!active) return;
        setProfile(value);
        cacheProfile(session.user.id, value);
      }).catch(() => undefined);
    }).catch(() => undefined);

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const open = () => setEditingProfile(true);
    window.addEventListener('driply:edit-profile', open);
    return () => window.removeEventListener('driply:edit-profile', open);
  }, []);

  return (
    <>
      <div hidden={editingProfile}>
        <MarketplaceApp profile={profile} />
      </div>
      {editingProfile && (
        <EditProfileScreen
          profile={profile}
          onBack={() => setEditingProfile(false)}
          onSaved={(saved) => {
            setProfile(saved);
            if (userId) cacheProfile(userId, saved);
            setEditingProfile(false);
          }}
        />
      )}
    </>
  );
}
