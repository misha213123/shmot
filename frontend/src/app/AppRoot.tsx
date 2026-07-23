import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, CheckCircle2, LoaderCircle, LogIn, UserPlus } from 'lucide-react';

import AppStable from './AppStable';
import { api, ApiError, type ApiProfile } from '../lib/api';
import { auth } from '../lib/auth';
import '../styles/auth.css';

type AuthMode = 'login' | 'register';

type CountryConfig = {
  name: string;
  phoneCode: string;
  phonePlaceholder: string;
  cities: string[];
};

type ProfileDraft = {
  username: string;
  display_name: string;
  phone: string;
  phone_code: string;
  country_code: string;
  city: string;
  bio: string;
};

const PROFILE_CACHE_PREFIX = 'driply.profile.';

const countries: Record<string, CountryConfig> = {
  RU: {
    name: 'Россия', phoneCode: '+7', phonePlaceholder: '999 123-45-67',
    cities: ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород', 'Краснодар', 'Самара', 'Ростов-на-Дону', 'Уфа', 'Омск', 'Воронеж', 'Пермь', 'Волгоград', 'Сочи'],
  },
  BY: {
    name: 'Беларусь', phoneCode: '+375', phonePlaceholder: '29 123-45-67',
    cities: ['Минск', 'Бобруйск', 'Гомель', 'Могилёв', 'Витебск', 'Гродно', 'Брест', 'Барановичи', 'Пинск', 'Орша', 'Мозырь', 'Солигорск', 'Новополоцк', 'Лида'],
  },
  KZ: {
    name: 'Казахстан', phoneCode: '+7', phonePlaceholder: '701 123-45-67',
    cities: ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар', 'Усть-Каменогорск', 'Семей', 'Атырау', 'Костанай', 'Кызылорда', 'Актау'],
  },
  UA: {
    name: 'Украина', phoneCode: '+380', phonePlaceholder: '67 123-45-67',
    cities: ['Киев', 'Харьков', 'Одесса', 'Днепр', 'Львов', 'Запорожье', 'Кривой Рог', 'Николаев', 'Винница', 'Полтава', 'Чернигов', 'Черкассы', 'Ивано-Франковск'],
  },
  AM: {
    name: 'Армения', phoneCode: '+374', phonePlaceholder: '91 123456',
    cities: ['Ереван', 'Гюмри', 'Ванадзор', 'Абовян', 'Раздан', 'Эчмиадзин', 'Капан', 'Армавир'],
  },
  GE: {
    name: 'Грузия', phoneCode: '+995', phonePlaceholder: '555 12-34-56',
    cities: ['Тбилиси', 'Батуми', 'Кутаиси', 'Рустави', 'Гори', 'Зугдиди', 'Поти', 'Телави'],
  },
};

const emptyProfile: ProfileDraft = {
  username: '',
  display_name: '',
  phone: '',
  phone_code: countries.RU.phoneCode,
  country_code: 'RU',
  city: '',
  bio: '',
};

function readableError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Произошла неизвестная ошибка';
}

function profileCacheKey(userId: string): string {
  return `${PROFILE_CACHE_PREFIX}${userId}`;
}

function readCachedProfile(userId: string): ApiProfile | null {
  try {
    const value = localStorage.getItem(profileCacheKey(userId));
    return value ? JSON.parse(value) as ApiProfile : null;
  } catch {
    return null;
  }
}

function cacheProfile(userId: string, value: ApiProfile): void {
  try {
    localStorage.setItem(profileCacheKey(userId), JSON.stringify(value));
  } catch {
    // Private browsing can disable storage. The live profile still works.
  }
}

function clearCachedProfile(userId: string): void {
  try {
    localStorage.removeItem(profileCacheKey(userId));
  } catch {
    // Ignore unavailable storage.
  }
}

function formatLocalPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}${digits.slice(9)}`;
}

export default function AppRoot() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfile);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedCountry = countries[draft.country_code];
  const citySuggestions = useMemo(() => {
    const query = draft.city.trim().toLocaleLowerCase('ru');
    if (!query) return selectedCountry.cities.slice(0, 6);
    return selectedCountry.cities.filter((city) => city.toLocaleLowerCase('ru').includes(query)).slice(0, 6);
  }, [draft.city, selectedCountry]);

  useEffect(() => {
    let active = true;

    auth.session()
      .then((value) => {
        if (active) setSession(value);
      })
      .catch((reason) => {
        if (active) setError(readableError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const subscription = auth.onChange((value) => {
      if (!active) return;
      setSession(value);
      if (!value) setProfile(null);
    });

    return () => {
      active = false;
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const userId = session.user.id;
    const cached = readCachedProfile(userId);

    // Never block the interface on a sleeping Render instance.
    // Returning users open the marketplace instantly from cache.
    // New users see onboarding immediately while the API refresh runs in background.
    setProfile(cached);

    api.myProfile()
      .then((value) => {
        if (!active) return;
        cacheProfile(userId, value);
        setProfile(value);
      })
      .catch((reason) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 404) {
          clearCachedProfile(userId);
          setProfile(null);
          return;
        }
        // Keep cached UI available during temporary network or cold-start issues.
        if (!cached) setError('Не удалось проверить профиль. Проверь интернет и повтори попытку.');
      });

    return () => {
      active = false;
    };
  }, [session]);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const nextSession = await auth.signIn(email.trim(), password);
        setSession(nextSession);
      } else {
        const user = await auth.signUp(email.trim(), password);
        if (user?.identities?.length === 0) throw new Error('Этот email уже зарегистрирован');
        const nextSession = await auth.session();
        if (nextSession) setSession(nextSession);
        else {
          setMessage('Проверь почту и подтверди регистрацию, затем войди в аккаунт.');
          setMode('login');
        }
      }
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setLoading(false);
    }
  };

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setProfileSaving(true);

    try {
      const localDigits = draft.phone.replace(/\D/g, '');
      const fullPhone = localDigits ? `${draft.phone_code}${localDigits}` : null;
      const saved = await api.saveMyProfile({
        username: draft.username.trim().replace(/^@/, ''),
        display_name: draft.display_name.trim(),
        phone: fullPhone,
        country_code: draft.country_code,
        city: draft.city.trim(),
        bio: draft.bio.trim() || null,
      });
      if (session) cacheProfile(session.user.id, saved);
      setProfile(saved);
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setProfileSaving(false);
    }
  };

  const changeCountry = (countryCode: string) => {
    const country = countries[countryCode];
    setDraft((current) => ({
      ...current,
      country_code: countryCode,
      phone_code: country.phoneCode,
      phone: '',
      city: '',
    }));
  };

  if (loading) return <main className="auth-shell auth-loading"><LoaderCircle className="spin" /><b>Загружаем DRIPLY</b></main>;

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-logo">DRIPLY<span>ЛИСТАЙ. НАХОДИ. НОСИ.</span></div>
          <div className="auth-heading">
            <h1>{mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}</h1>
            <p>{mode === 'login' ? 'Войди, чтобы сохранять вещи и публиковать объявления.' : 'Один аккаунт для покупок и продаж.'}</p>
          </div>
          <form onSubmit={submitAuth} className="auth-form">
            <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></label>
            <label>Пароль<input type="password" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 6 символов" required /></label>
            {error && <p className="form-alert error">{error}</p>}
            {message && <p className="form-alert success"><CheckCircle2 size={18} />{message}</p>}
            <button className="auth-primary" type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="spin" /> : mode === 'login' ? <LogIn /> : <UserPlus />}
              {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
          <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }}>
            {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="auth-shell onboarding-shell">
        <section className="auth-card onboarding-card">
          <div className="onboarding-step">ШАГ 1 ИЗ 1</div>
          <h1>Расскажи о себе</h1>
          <p>Эти данные будут видны покупателям и продавцам.</p>
          <form onSubmit={submitProfile} className="auth-form profile-form">
            <label>Имя<input value={draft.display_name} onChange={(event) => setDraft({ ...draft, display_name: event.target.value })} placeholder="Михаил" minLength={2} required /></label>
            <label>Username<input value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder="drip.collector" minLength={3} pattern="[a-zA-Z0-9._-]+" required /></label>
            <div className="auth-row">
              <label>Страна<select value={draft.country_code} onChange={(event) => changeCountry(event.target.value)}>{Object.entries(countries).map(([code, country]) => <option key={code} value={code}>{country.name}</option>)}</select></label>
              <label className="city-field">Город<input list="city-options" autoComplete="off" value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} placeholder="Начните вводить город" required /><datalist id="city-options">{citySuggestions.map((city) => <option key={city} value={city} />)}</datalist></label>
            </div>
            <label>Телефон<div className="phone-field"><select aria-label="Код страны" value={draft.phone_code} onChange={(event) => setDraft({ ...draft, phone_code: event.target.value })}>{Object.entries(countries).map(([code, country]) => <option key={code} value={country.phoneCode}>{country.phoneCode} · {code}</option>)}</select><input type="tel" inputMode="tel" autoComplete="tel-national" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: formatLocalPhone(event.target.value) })} placeholder={selectedCountry.phonePlaceholder} /></div></label>
            <label>О себе<textarea rows={3} value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} placeholder="Что продаёшь, как отправляешь товары" /></label>
            {error && <p className="form-alert error">{error}</p>}
            <button className="auth-primary" type="submit" disabled={profileSaving}>{profileSaving ? <LoaderCircle className="spin" /> : <ArrowRight />}Перейти в DRIPLY</button>
          </form>
          <button className="auth-switch" onClick={() => auth.signOut()}>Выйти из аккаунта</button>
        </section>
      </main>
    );
  }

  return <AppStable />;
}
