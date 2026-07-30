import { Heart, Home, Plus, Search, User } from 'lucide-react';

export type MainScreen = 'feed' | 'explore' | 'create' | 'likes' | 'profile';

type Props = {
  activeScreen: MainScreen;
  onNavigate: (screen: MainScreen) => void;
};

export default function BottomNavigation({ activeScreen, onNavigate }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <button type="button" className={activeScreen === 'feed' ? 'active' : ''} aria-current={activeScreen === 'feed' ? 'page' : undefined} onClick={() => onNavigate('feed')}><Home /><span>Лента</span></button>
      <button type="button" className={activeScreen === 'explore' ? 'active' : ''} aria-current={activeScreen === 'explore' ? 'page' : undefined} onClick={() => onNavigate('explore')}><Search /><span>Поиск</span></button>
      <button type="button" className="create" aria-label="Добавить товар" onClick={() => onNavigate('create')}><Plus /></button>
      <button type="button" className={activeScreen === 'likes' ? 'active' : ''} aria-current={activeScreen === 'likes' ? 'page' : undefined} onClick={() => onNavigate('likes')}><Heart /><span>Избранное</span></button>
      <button type="button" className={activeScreen === 'profile' ? 'active' : ''} aria-current={activeScreen === 'profile' ? 'page' : undefined} onClick={() => onNavigate('profile')}><User /><span>Профиль</span></button>
    </nav>
  );
}
