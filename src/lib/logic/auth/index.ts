import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Subscription } from '@supabase/auth-js';
import type { AuthResult, Profile } from '$lib/logic/types/auth';

type AuthErrorLike = {
	message?: string;
	code?: string;
	status?: number;
};

function errorCode(error: AuthErrorLike): string | undefined {
	return error.code ?? (error.status ? String(error.status) : undefined);
}

function authResultFromError(error: AuthErrorLike): AuthResult {
	return {
		success: false,
		error: error.message,
		errorCode: errorCode(error)
	};
}

function authResultFromData(data: { session?: Session | null; user?: User | null } | null): AuthResult {
	return {
		success: true,
		session: data?.session ?? undefined,
		user: data?.user ?? undefined
	};
}

export function isPasskeySupported(): boolean {
	return typeof PublicKeyCredential !== 'undefined';
}

export async function signInWithPasskey(supabase: SupabaseClient): Promise<AuthResult> {
	if (!isPasskeySupported()) {
		return {
			success: false,
			errorCode: 'passkey_not_supported'
		};
	}

	const { data, error } = await (supabase.auth as any).signInWithPasskey();

	if (error) {
		return authResultFromError(error);
	}

	return authResultFromData(data ?? null);
}

export async function registerPasskey(supabase: SupabaseClient): Promise<AuthResult> {
	const { data, error } = await (supabase.auth as any).registerPasskey();

	if (error) {
		return authResultFromError(error);
	}

	return authResultFromData(data ?? null);
}

export async function listPasskeys(supabase: SupabaseClient) {
	const { data, error } = await (supabase.auth as any).passkey.list();
	if (error) throw error;
	return data;
}

export async function updatePasskey(supabase: SupabaseClient, id: string, name: string) {
	const { error } = await (supabase.auth as any).passkey.update({ id, name });
	if (error) throw error;
}

export async function deletePasskey(supabase: SupabaseClient, id: string) {
	const { error } = await (supabase.auth as any).passkey.delete({ id });
	if (error) throw error;
}

export async function signInWithMagicLink(
	supabase: SupabaseClient,
	email: string
): Promise<AuthResult> {
	const { data, error } = await supabase.auth.signInWithOtp({
		email,
		options: { shouldCreateUser: false }
	});

	if (error) {
		return authResultFromError(error);
	}

	return authResultFromData(data ?? null);
}

export async function signOut(supabase: SupabaseClient): Promise<void> {
	const { error } = await supabase.auth.signOut();

	if (error) {
		throw error;
	}
}

export async function getSession(supabase: SupabaseClient): Promise<Session | null> {
	const { data, error } = await supabase.auth.getSession();

	if (error) {
		return null;
	}

	return data.session;
}

export function onAuthStateChange(
	supabase: SupabaseClient,
	callback: (session: Session | null) => void
): Subscription {
	const { data } = supabase.auth.onAuthStateChange((_event, session) => {
		callback(session);
	});

	return data.subscription;
}

export async function getCurrentUser(supabase: SupabaseClient): Promise<User | null> {
	const session = await getSession(supabase);

	return session?.user ?? null;
}

export function requireAdmin(
	authStore: { isAdmin: boolean },
	goto: (path: string) => void,
	toast: { error: (msg: string) => void },
	message: string
): void {
	if (!authStore.isAdmin) {
		toast.error(message);
		goto('/auth/login');
	}
}

export async function getProfile(
	supabase: SupabaseClient,
	userId: string
): Promise<Profile | null> {
	const { data, error } = await supabase
		.from('profiles')
		.select('id, callsign, grid_square, qth, role, created_at')
		.eq('id', userId)
		.single();

	if (error) {
		return null;
	}

	return data as Profile;
}

export async function handleLogout(
	supabase: SupabaseClient,
	goto: (url: string) => unknown
): Promise<void> {
	try {
		await signOut(supabase);
		goto('/auth/login');
	} catch {}
}

export async function updateProfile(
	supabase: SupabaseClient,
	userId: string,
	data: Partial<Profile>
): Promise<Profile> {
	const { data: profile, error } = await supabase
		.from('profiles')
		.update(data)
		.eq('id', userId)
		.select('id, callsign, grid_square, qth, role, created_at')
		.single();

	if (error) {
		throw error;
	}

	return profile as Profile;
}
