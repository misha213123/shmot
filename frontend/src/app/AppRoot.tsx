import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, CheckCircle2, LoaderCircle, LogIn, UserPlus } from 'lucide-react';

import AppStable from './AppStable';
import { api, ApiError, type ApiProfile } from '../lib/api';
import { auth } from '../lib/auth';
import '../styles/auth.css';

type AuthMode = 'login' | 'register';

type ProfileDraft = {
  username: string;
  display_name: string;
  phone: string;
  country_code: string;
  city: string;
  bio: string;
};

const emptyProfile: ProfileDraft = {
  username: '',
  display_name: '',
  phone: '',
  country_code: 'RU',
  city: 'Москва',
  bio: '',
};

function readableError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Произошла неизвестная ошибка';
}

export default function AppRoot() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfile);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
    setProfileLoading(true);

    api.myProfile()
      .then((value) => {
        if (active) setProfile(value);
      })
      .catch((reason) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 404) {
          setProfile(null);
          return;
        }
        setError(readableError(reason));
      })
      .finally(() => {
        if (active) setProfileLoading(false);
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
        if (user?.identities?.length === 0) {
          throw new Error('Этот email уже зарегистрирован');
        }
        const nextSession = await auth.session();
        if (nextSession) {
          setSession(nextSession);
        } else {
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
    setProfileLoading(true);

    try {
      const saved = await api.saveMyProfile({
        username: draft.username.trim().replace(/^@/, ''),
        display_name: draft.display_name.trim(),
        phone: draft.phone.trim() || null,
        country_code: draft.country_code,
        city: draft.city.trim(),
        bio: draft.bio.trim() || null,
      });
      setProfile(saved);
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading) {
    return <main className="auth-shell auth-loading"><LoaderCircle className="spin" /><b>Загружаем DRIPLY</b></main>;
  }

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

  if (profileLoading) {
    return <main className="auth-shell auth-loading"><LoaderCircle className="spin" /><b>Загружаем профиль</b></main>;
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
              <label>Страна<select value={draft.country_code} onChange={(event) => setDraft({ ...draft, country_code: event.target.value })}><option value="RU">Россия</option><option value="BY">Беларусь</option><option value="KZ">Казахстан</option><option value="UA">Украина</option><option value="AM">Армения</option><option value="GE">Грузия</option></select></label>
              <label>Город<input value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} required /></label>
            </div>
            <label>Телефон или Telegram<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="+7... или @username" /></label>
            <label>О себе<textarea rows={3} value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} placeholder="Что продаёшь, как отправляешь товары" /></label>
            {error && <p className="form-alert error">{error}</p>}
            <button className="auth-primary" type="submit" disabled={profileLoading}>{profileLoading ? <LoaderCircle className="spin" /> : <ArrowRight />}Перейти в DRIPLY</button>
          </form>
          <button className="auth-switch" onClick={() => auth.signOut()}>Выйти из аккаунта</button>
        </section>
      </main>
    );
  }

  return <AppStable />;
}
