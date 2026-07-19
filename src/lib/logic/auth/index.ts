import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { PasskeyListItem, Subscription } from '@supabase/auth-js';
import type { AuthResult, Profile } from '$lib/logic/types/auth';
import {
	AUTH_DEADLINE_MS,
	DATABASE_READ_DEADLINE_MS,
	DATABASE_WRITE_DEADLINE_MS,
	WEBAUTHN_DEADLINE_MS,
	withDeadline
} from '$lib/logic/deadline';
import { AppError, toAppError } from '$lib/logic/errors';

type AuthErrorLike = {
	message?: string;
	code?: string;
	status?: number;
};

type AuthCallResponse = {
	data: { session?: Session | null; user?: User | null } | null;
	error: AuthErrorLike | null;
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

function authResultFromData(
	data: { session?: Session | null; user?: User | null } | null
): AuthResult {
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

	const { data, error } = await withDeadline<AuthCallResponse>(
		'sign in with passkey',
		WEBAUTHN_DEADLINE_MS,
		(signal) => supabase.auth.signInWithPasskey({ options: { signal } })
	);

	if (error) {
		return authResultFromError(error);
	}

	return authResultFromData(data ?? null);
}

export async function registerPasskey(supabase: SupabaseClient): Promise<AuthResult> {
	const { error } = await withDeadline('register passkey', WEBAUTHN_DEADLINE_MS, (signal) =>
		supabase.auth.registerPasskey({ options: { signal } })
	);

	if (error) {
		return authResultFromError(error);
	}

	return { success: true };
}

export async function listPasskeys(supabase: SupabaseClient): Promise<PasskeyListItem[]> {
	const { data, error } = await withDeadline<{
		data: PasskeyListItem[] | null;
		error: AuthErrorLike | null;
	}>('list passkeys', AUTH_DEADLINE_MS, () => supabase.auth.passkey.list());
	if (error) throw error;
	return data ?? [];
}

export async function updatePasskey(supabase: SupabaseClient, id: string, name: string) {
	const { error } = await withDeadline<{ error: AuthErrorLike | null }>(
		'update passkey',
		AUTH_DEADLINE_MS,
		() => supabase.auth.passkey.update({ passkeyId: id, friendlyName: name })
	);
	if (error) throw error;
}

export async function deletePasskey(supabase: SupabaseClient, id: string) {
	const { error } = await withDeadline<{ error: AuthErrorLike | null }>(
		'delete passkey',
		AUTH_DEADLINE_MS,
		() => supabase.auth.passkey.delete({ passkeyId: id })
	);
	if (error) throw error;
}

export async function signInWithMagicLink(
	supabase: SupabaseClient,
	email: string,
	redirectTo?: string
): Promise<AuthResult> {
	const { data, error } = await withDeadline('send magic link', AUTH_DEADLINE_MS, () =>
		supabase.auth.signInWithOtp({
			email,
			options: { shouldCreateUser: false, emailRedirectTo: redirectTo }
		})
	);

	if (error) {
		return authResultFromError(error);
	}

	return authResultFromData(data ?? null);
}

export async function signOut(supabase: SupabaseClient): Promise<void> {
	const { error } = await withDeadline('sign out', AUTH_DEADLINE_MS, () => supabase.auth.signOut());

	if (error) {
		throw error;
	}
}

export async function getSession(
	supabase: SupabaseClient,
	signal?: AbortSignal
): Promise<Session | null> {
	const { data, error } = await withDeadline(
		'get session',
		AUTH_DEADLINE_MS,
		() => supabase.auth.getSession(),
		signal
	);

	if (error) {
		throw toAppError(error, 'get session');
	}

	return data.session;
}

export async function ensureSession(
	supabase: SupabaseClient,
	timeoutMs = AUTH_DEADLINE_MS,
	signal?: AbortSignal
): Promise<Session> {
	const session = await withDeadline(
		'ensure session',
		timeoutMs,
		() => getSession(supabase, signal),
		signal
	);
	if (!session) throw new AppError('auth', 'ensure session', 'Authentication is required');
	return session;
}

export async function runAuthenticated<T>(
	supabase: SupabaseClient,
	operation: string,
	callback: (signal: AbortSignal) => PromiseLike<T>,
	timeoutMs = DATABASE_WRITE_DEADLINE_MS,
	signal?: AbortSignal
): Promise<T> {
	await ensureSession(supabase, AUTH_DEADLINE_MS, signal);
	try {
		return await withDeadline(operation, timeoutMs, callback, signal);
	} catch (error) {
		throw toAppError(error, operation);
	}
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
	const { data, error } = await withDeadline('load profile', DATABASE_READ_DEADLINE_MS, (signal) =>
		supabase
			.from('profiles')
			.select('id, callsign, grid_square, qth, role, created_at')
			.eq('id', userId)
			.abortSignal(signal)
			.maybeSingle()
	);

	if (error) {
		throw toAppError(error, 'load profile');
	}

	return (data as Profile | null) ?? null;
}

export async function handleLogout(
	supabase: SupabaseClient,
	goto: (url: string) => unknown
): Promise<void> {
	try {
		await signOut(supabase);
		goto('/auth/login');
	} catch {
		// Best-effort logout cleanup: keep the current page when remote sign-out fails.
	}
}

export async function updateProfile(
	supabase: SupabaseClient,
	userId: string,
	data: Partial<Profile>
): Promise<Profile> {
	const { data: profile, error } = await withDeadline(
		'update profile',
		DATABASE_WRITE_DEADLINE_MS,
		(signal) =>
			supabase
				.from('profiles')
				.update(data)
				.eq('id', userId)
				.select('id, callsign, grid_square, qth, role, created_at')
				.abortSignal(signal)
				.maybeSingle()
	);

	if (error) {
		throw toAppError(error, 'update profile');
	}
	if (!profile) throw new AppError('not-found', 'update profile', 'Profile not found or forbidden');

	return profile as Profile;
}
