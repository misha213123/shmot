import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

import AppHeader from '../../shared/navigation/AppHeader';

type Props = {
  query: string;
  results: ReactNode;
  hasResults: boolean;
  onQueryChange: (value: string) => void;
  onBack: () => void;
  onNotifications: () => void;
  onFilters: () => void;
  onProfileSettings: () => void;
};

export default function SearchScreen({
  query,
  results,
  hasResults,
  onQueryChange,
  onNotifications,
  onFilters,
  onProfileSettings,
}: Props) {
  return (
    <>
      <AppHeader
        title="Поиск"
        back={false}
        onNotifications={onNotifications}
        onFilters={onFilters}
        onProfileSettings={onProfileSettings}
      />

      <div className="search-box motion-search">
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Бренд, категория или город"
          aria-label="Поиск товаров"
        />
      </div>

      {hasResults ? results : (
        <div className="empty-state">
          <b>Ничего не найдено</b>
          <p>Попробуй другой запрос.</p>
        </div>
      )}
    </>
  );
}
