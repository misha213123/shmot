import type { ReactNode } from 'react';

import AppHeader from '../../shared/navigation/AppHeader';
import type { ApiProfile } from '../../lib/api';
import { openDealCenter } from '../../lib/dealRuntime';

type ProfileTab = 'active' | 'sold' | 'archived';

type Props = {
  profile: ApiProfile;
  location: string;
  activeTab: ProfileTab;
  loading: boolean;
  hasProducts: boolean;
  products: ReactNode;
  onTabChange: (tab: ProfileTab) => void;
  onCreateProduct: () => void;
  onSettings: () => void;
  onBack: () => void;
  onNotifications: () => void;
  onFilters: () => void;
};

function initials(name: string) {
  return (name || 'U').trim().slice(0, 1).toUpperCase();
}

export default function ProfileScreen({
  profile,
  location,
  activeTab,
  loading,
  hasProducts,
  products,
  onTabChange,
  onCreateProduct,
  onBack,
  onNotifications,
  onFilters,
}: Props) {
  const openSettings = () => window.dispatchEvent(new Event('driply:edit-profile'));

  return (
    <>
      <AppHeader
        title="Профиль"
        back={false}
        onBack={onBack}
        onNotifications={onNotifications}
        onFilters={onFilters}
        onProfileSettings={openSettings}
      />

      <section className="profile-head motion-header">
        {profile.avatar_url ? (
          <img className="avatar large" src={profile.avatar_url} alt={profile.display_name || profile.username} />
        ) : (
          <div className="avatar large">{initials(profile.display_name || profile.username)}</div>
        )}
        <h2>@{profile.username}{profile.is_verified ? ' ✓' : ''}</h2>
        <p>{location}</p>
        {profile.bio && <small>{profile.bio}</small>}
      </section>

      <button type="button" className="deal-center-button" onClick={() => void openDealCenter()}>
        <span>⇄</span>
        <b>Мои покупки и продажи</b>
        <small>Предложения цены и статусы сделок</small>
      </button>

      <nav className="profile-product-tabs motion-tabs" aria-label="Товары профиля">
        <button type="button" className={activeTab === 'active' ? 'active' : ''} onClick={() => onTabChange('active')}>Активные</button>
        <button type="button" className={activeTab === 'sold' ? 'active' : ''} onClick={() => onTabChange('sold')}>Проданные</button>
        <button type="button" className={activeTab === 'archived' ? 'active' : ''} onClick={() => onTabChange('archived')}>Архив</button>
      </nav>

      {loading ? (
        <div className="profile-products-loading">Обновляем объявления…</div>
      ) : hasProducts ? products : (
        <section className="empty-profile-products motion-pop">
          <div>＋</div>
          <h3>Здесь пока пусто</h3>
          <p>{activeTab === 'active' ? 'Добавь первую вещь — она появится в профиле.' : 'Товары с этим статусом появятся здесь.'}</p>
          {activeTab === 'active' && <button className="primary-button" type="button" onClick={onCreateProduct}>Добавить товар</button>}
        </section>
      )}
    </>
  );
}
