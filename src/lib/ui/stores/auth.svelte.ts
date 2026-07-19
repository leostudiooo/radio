import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import { getProfile, getSession, onAuthStateChange } from '$lib/logic/auth';
import type { Profile } from '$lib/logic/types/auth';
import type { Subscription } from '@supabase/auth-js';
import { toAppError, type AppError } from '$lib/logic/errors';

let subscription: Subscription | null = null;
let listenerRegistered = false;

function createAuthStore() {
	let loading = $state(true);
	let session = $state<Session | null>(null);
	let user = $state<User | null>(null);
	let profile = $state<Profile | null>(null);
	let error = $state<AppError | null>(null);
	let profileRequestId = 0;

	const isAuthenticated = $derived(!!session && !!user);
	const callsign = $derived(profile?.callsign ?? null);
	const isAdmin = $derived(profile?.role === 'admin');

	async function refreshProfile() {
		const requestId = ++profileRequestId;
		const userId = user?.id;
		if (!userId) {
			profile = null;
			error = null;
			return;
		}

		try {
			const nextProfile = await getProfile(supabase, userId);
			if (requestId !== profileRequestId) return;
			profile = nextProfile;
			error = null;
		} catch (cause) {
			if (requestId !== profileRequestId) return;
			error = toAppError(cause, 'load profile');
			throw error;
		}
	}

	function applySession(newSession: Session | null) {
		session = newSession;
		user = newSession?.user ?? null;
		void refreshProfile().catch(() => undefined);
	}

	async function initAuth() {
		if (listenerRegistered) return;
		listenerRegistered = true;
		subscription = onAuthStateChange(supabase, applySession);

		try {
			const nextSession = await getSession(supabase);
			session = nextSession;
			user = nextSession?.user ?? null;
			await refreshProfile();
		} catch (cause) {
			error = toAppError(cause, 'initialize authentication');
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
		get error() {
			return error;
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
