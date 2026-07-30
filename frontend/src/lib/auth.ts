import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from './supabase';

function ensureConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase не настроен в переменных окружения Vercel');
  }
}

export const auth = {
  async signUp(email: string, password: string): Promise<User | null> {
    ensureConfigured();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signIn(email: string, password: string): Promise<Session> {
    ensureConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string): Promise<void> {
    ensureConfigured();
    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  async session(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async accessToken(): Promise<string | null> {
    const current = await this.session();
    if (!current) return null;

    const expiresAtMs = (current.expires_at ?? 0) * 1000;
    const shouldRefresh = !expiresAtMs || expiresAtMs <= Date.now() + 60_000;
    if (!shouldRefresh) return current.access_token;

    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      await supabase.auth.signOut().catch(() => undefined);
      return null;
    }

    return data.session.access_token;
  },

  onChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => callback(session));
  },
};