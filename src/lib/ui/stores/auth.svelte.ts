import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import { onAuthStateChange, getProfile } from '$lib/logic/auth';
import type { Profile } from '$lib/logic/types/auth';
import type { Subscription } from '@supabase/auth-js';

let subscription: Subscription | null = null;

function createAuthStore() {
  let session = $state<Session | null>(null);
  let user = $state<User | null>(null);
  let profile = $state<Profile | null>(null);

  let isAuthenticated = $derived(!!session && !!user);
  let callsign = $derived(profile?.callsign ?? null);
  let isAdmin = $derived(profile?.role === 'admin');

  async function refreshProfile() {
    if (user?.id) {
      const p = await getProfile(supabase, user.id);
      profile = p;
    } else {
      profile = null;
    }
  }

  function init() {
    if (subscription) return;

    supabase.auth.getSession().then(({ data }) => {
      session = data.session;
      user = data.session?.user ?? null;
      refreshProfile();
    });

    subscription = onAuthStateChange(supabase, (newSession) => {
      session = newSession;
      user = newSession?.user ?? null;
      refreshProfile();
    });
  }

  function cleanup() {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
  }

  return {
    get session() { return session; },
    get user() { return user; },
    get profile() { return profile; },
    get isAuthenticated() { return isAuthenticated; },
    get callsign() { return callsign; },
    get isAdmin() { return isAdmin; },
    init,
    cleanup,
  };
}

export const authStore = createAuthStore();
