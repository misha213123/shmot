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
    const session = await this.session();
    return session?.access_token ?? null;
  },

  onChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => callback(session));
  },
};
