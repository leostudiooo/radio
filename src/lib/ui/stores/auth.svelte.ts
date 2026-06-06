import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import { onAuthStateChange, getProfile } from '$lib/logic/auth';
import type { Profile } from '$lib/logic/types/auth';
import type { Subscription } from '@supabase/auth-js';

let subscription: Subscription | null = null;
let listenerRegistered = false;

function createAuthStore() {
	let loading = $state(true);
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

	async function initAuth() {
		if (listenerRegistered) return;
		listenerRegistered = true;

		try {
			const { data } = await supabase.auth.getSession();
			session = data.session;
			user = data.session?.user ?? null;
			await refreshProfile();

			subscription = onAuthStateChange(supabase, (async (newSession) => {
				session = newSession;
				user = newSession?.user ?? null;
				await refreshProfile();
			}) as (session: Session | null) => void);
		} finally {
			loading = false;
		}
	}

	function cleanup() {
		if (subscription) {
			subscription.unsubscribe();
			subscription = null;
			listenerRegistered = false;
		}
	}

	if (typeof window !== 'undefined') initAuth();
	if (import.meta.hot) import.meta.hot.dispose(cleanup);

	return {
		get loading() {
			return loading;
		},
		get session() {
			return session;
		},
		get user() {
			return user;
		},
		get profile() {
			return profile;
		},
		get isAuthenticated() {
			return isAuthenticated;
		},
		get callsign() {
			return callsign;
		},
		get isAdmin() {
			return isAdmin;
		},
		get refreshProfile() {
			return refreshProfile;
		}
	};
}

export const authStore = createAuthStore();
