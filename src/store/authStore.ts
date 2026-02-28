import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/types';

const PROFILE_FETCH_TIMEOUT_MS = 8000;
const isDev = import.meta.env.DEV;

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  error: string | null;

  init: () => () => void;
  fetchProfile: (userId: string, email?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    meta: { full_name: string },
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
}

async function fetchWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Profile fetch timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  profileLoading: false,
  profileError: null,
  error: null,

  fetchProfile: async (userId: string, email?: string) => {
    set({ profileLoading: true, profileError: null });

    try {
      const { data, error: fetchErr } = await fetchWithTimeout(
        Promise.resolve(supabase.from('profiles').select('*').eq('id', userId).single()),
        PROFILE_FETCH_TIMEOUT_MS,
      );

      if (fetchErr) {
        const isNotFound =
          fetchErr.code === 'PGRST116' ||
          fetchErr.message?.includes('no rows');

        if (isNotFound) {
          if (isDev) console.warn('[auth] Profile row missing, upserting default.');

          const fallback: Partial<Profile> = {
            id: userId,
            email: email ?? get().user?.email ?? '',
            full_name: '',
            role: 'client',
          };

          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert(fallback);

          if (upsertErr) {
            if (isDev) console.error('[auth] Profile upsert failed:', upsertErr.message);
            set({ profile: null, role: 'unknown', profileLoading: false, profileError: upsertErr.message });
            return;
          }

          const { data: refetched, error: refetchErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (refetchErr || !refetched) {
            if (isDev) console.error('[auth] Profile refetch failed:', refetchErr?.message);
            set({ profile: null, role: 'unknown', profileLoading: false, profileError: refetchErr?.message ?? 'Refetch failed' });
            return;
          }

          const profile = refetched as Profile;
          set({ profile, role: profile.role, profileLoading: false });
          return;
        }

        console.error('[auth] Profile fetch error:', fetchErr.message);
        set({ profile: null, role: 'unknown', profileLoading: false, profileError: fetchErr.message });
        return;
      }

      const profile = data as Profile;
      set({ profile, role: profile.role, profileLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[auth] Profile fetch failed:', msg);
      set({ profile: null, role: 'unknown', profileLoading: false, profileError: msg });
    }
  },

  init: () => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const user = session?.user ?? null;
        set({ session, user, loading: false });

        if (user) {
          get().fetchProfile(user.id, user.email ?? undefined);
        }
      })
      .catch((err) => {
        if (isDev) console.error('[auth] getSession failed:', err);
        set({ session: null, user: null, loading: false });
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        set({ session, user, loading: false });

        if (user) {
          get().fetchProfile(user.id, user.email ?? undefined);
        } else {
          set({ profile: null, role: null, profileLoading: false, profileError: null });
        }
      },
    );

    return () => subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false, error: error.message });
      return false;
    }
    set({ loading: false });
    return true;
  },

  signUp: async (email, password, meta) => {
    set({ loading: true, error: null });

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: meta.full_name } },
    });

    if (error) {
      set({ loading: false, error: error.message });
      return false;
    }

    set({ loading: false });
    return true;
  },

  signOut: async () => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({
      user: null,
      session: null,
      profile: null,
      role: null,
      profileLoading: false,
      profileError: null,
      loading: false,
    });
  },
}));
