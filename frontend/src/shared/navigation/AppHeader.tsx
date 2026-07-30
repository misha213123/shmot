import { Bell, ChevronLeft, Settings, SlidersHorizontal } from 'lucide-react';

type Props = {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  onNotifications: () => void;
  onFilters: () => void;
  onProfileSettings: () => void;
};

export default function AppHeader({
  title = 'DRIPLY',
  back = false,
  onBack,
  onNotifications,
  onFilters,
  onProfileSettings,
}: Props) {
  const isProfile = title === 'Профиль';

  return (
    <header className="topbar motion-header">
      <button
        type="button"
        className="icon-button pressable"
        aria-label={back ? 'Назад' : 'Уведомления'}
        onClick={back ? onBack : onNotifications}
      >
        {back ? <ChevronLeft /> : <Bell size={21} />}
      </button>

      <div className="brand">
        <strong>{title}</strong>
        {title === 'DRIPLY' && <span>ЛИСТАЙ. НАХОДИ. НОСИ.</span>}
      </div>

      <button
        type="button"
        className="icon-button pressable"
        aria-label={isProfile ? 'Настройки профиля' : 'Фильтры'}
        onClick={isProfile ? onProfileSettings : onFilters}
      >
        {isProfile ? <Settings size={21} /> : <SlidersHorizontal size={21} />}
      </button>
    </header>
  );
}
