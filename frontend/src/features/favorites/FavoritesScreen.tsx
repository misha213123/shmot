import type { ReactNode } from 'react';
import { Heart } from 'lucide-react';

import AppHeader from '../../shared/navigation/AppHeader';

type Props = {
  products: ReactNode;
  hasProducts: boolean;
  onBack: () => void;
  onNotifications: () => void;
  onFilters: () => void;
  onProfileSettings: () => void;
};

export default function FavoritesScreen({
  products,
  hasProducts,
  onNotifications,
  onFilters,
  onProfileSettings,
}: Props) {
  return (
    <>
      <AppHeader
        title="Избранное"
        back={false}
        onNotifications={onNotifications}
        onFilters={onFilters}
        onProfileSettings={onProfileSettings}
      />

      {hasProducts ? products : (
        <div className="empty-state motion-pop">
          <Heart />
          <b>Избранное пока пустое</b>
          <p>Нажимай сердце или свайпай карточки вправо.</p>
        </div>
      )}
    </>
  );
}
