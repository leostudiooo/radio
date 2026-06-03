import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
	getCurrentUser,
	getProfile,
	getSession,
	onAuthStateChange,
	signInWithGitHub,
	signInWithMagicLink,
	signInWithWebAuthn,
	signOut,
	updateProfile
} from './index';
import type { Profile } from '$lib/logic/types/auth';

type QueryResult<T> = { data: T | null; error: Error | null };

function createUser(overrides: Partial<User> = {}): User {
	return {
		id: 'user-1',
		app_metadata: {},
		user_metadata: {},
		aud: 'authenticated',
		created_at: '2026-01-01T00:00:00.000Z',
		...overrides
	} as User;
}

function createSession(user = createUser()): Session {
	return {
		access_token: 'access-token',
		token_type: 'bearer',
		expires_in: 3600,
		expires_at: 1_767_225_600,
		refresh_token: 'refresh-token',
		user
	};
}

function createProfile(overrides: Partial<Profile> = {}): Profile {
	return {
		id: 'user-1',
		callsign: 'K1ABC',
		grid_square: 'FN31',
		qth: 'New York',
		created_at: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

function createSupabase(overrides: Partial<SupabaseClient> = {}): SupabaseClient {
	return overrides as SupabaseClient;
}

function createProfilesQuery<T>(result: QueryResult<T>) {
	const query = {
		select: vi.fn(() => query),
		update: vi.fn(() => query),
		eq: vi.fn(() => query),
		single: vi.fn(async () => result)
	};

	return query;
}

describe('auth logic helpers', () => {
	it('signs in with WebAuthn when the injected client supports it', async () => {
		const session = createSession();
		const signInWithWebAuthnMock = vi.fn(async () => ({
			data: { session, user: session.user },
			error: null
		}));
		const supabase = createSupabase({
			auth: { signInWithWebAuthn: signInWithWebAuthnMock }
		} as unknown as SupabaseClient);

		await expect(signInWithWebAuthn(supabase)).resolves.toEqual({
			success: true,
			session,
			user: session.user
		});
		expect(signInWithWebAuthnMock).toHaveBeenCalledOnce();
	});

	it('returns a typed WebAuthn error when the client does not support passkeys', async () => {
		const supabase = createSupabase({ auth: {} } as unknown as SupabaseClient);

		await expect(signInWithWebAuthn(supabase)).resolves.toEqual({
			success: false,
			error: 'WebAuthn sign-in is not supported by this Supabase client.',
			errorCode: 'webauthn_not_supported'
		});
	});

	it('returns OAuth sign-in data for GitHub', async () => {
		const session = createSession();
		const signInWithOAuth = vi.fn(async () => ({
			data: { session, user: session.user },
			error: null
		}));
		const supabase = createSupabase({ auth: { signInWithOAuth } } as unknown as SupabaseClient);

		await expect(signInWithGitHub(supabase)).resolves.toEqual({
			success: true
		});
		expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'github' });
	});

	it('returns OAuth errors for GitHub sign-in failures', async () => {
		const signInWithOAuth = vi.fn(async () => ({
			data: null,
			error: { message: 'OAuth failed', code: 'oauth_failed' }
		}));
		const supabase = createSupabase({ auth: { signInWithOAuth } } as unknown as SupabaseClient);

		await expect(signInWithGitHub(supabase)).resolves.toEqual({
			success: false,
			error: 'OAuth failed',
			errorCode: 'oauth_failed'
		});
	});

	it('requests a magic link for the given email', async () => {
		const signInWithOtp = vi.fn(async () => ({ data: {}, error: null }));
		const supabase = createSupabase({ auth: { signInWithOtp } } as unknown as SupabaseClient);

		await expect(signInWithMagicLink(supabase, 'ham@example.com')).resolves.toEqual({
			success: true,
			session: undefined,
			user: undefined
		});
		expect(signInWithOtp).toHaveBeenCalledWith({ email: 'ham@example.com' });
	});

	it('returns magic-link errors', async () => {
		const signInWithOtp = vi.fn(async () => ({
			data: null,
			error: { message: 'Invalid email', status: 400 }
		}));
		const supabase = createSupabase({ auth: { signInWithOtp } } as unknown as SupabaseClient);

		await expect(signInWithMagicLink(supabase, 'bad-email')).resolves.toEqual({
			success: false,
			error: 'Invalid email',
			errorCode: '400'
		});
	});

	it('signs out through Supabase auth', async () => {
		const signOutMock = vi.fn(async () => ({ error: null }));
		const supabase = createSupabase({ auth: { signOut: signOutMock } } as unknown as SupabaseClient);

		await expect(signOut(supabase)).resolves.toBeUndefined();
		expect(signOutMock).toHaveBeenCalledOnce();
	});

	it('throws sign-out errors', async () => {
		const error = new Error('Sign out failed');
		const supabase = createSupabase({
			auth: { signOut: vi.fn(async () => ({ error })) }
		} as unknown as SupabaseClient);

		await expect(signOut(supabase)).rejects.toThrow(error);
	});

	it('returns the current session', async () => {
		const session = createSession();
		const supabase = createSupabase({
			auth: { getSession: vi.fn(async () => ({ data: { session }, error: null })) }
		} as unknown as SupabaseClient);

		await expect(getSession(supabase)).resolves.toBe(session);
	});

	it('returns null when session lookup fails', async () => {
		const supabase = createSupabase({
			auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: new Error('No session') })) }
		} as unknown as SupabaseClient);

		await expect(getSession(supabase)).resolves.toBeNull();
	});

	it('subscribes to auth-state changes and forwards sessions only', () => {
		const session = createSession();
		const subscription = { id: 'subscription-1', unsubscribe: vi.fn() };
		const callback = vi.fn();
		const onAuthStateChangeMock = vi.fn((handler: (_event: string, session: Session | null) => void) => {
			handler('SIGNED_IN', session);

			return { data: { subscription } };
		});
		const supabase = createSupabase({
			auth: { onAuthStateChange: onAuthStateChangeMock }
		} as unknown as SupabaseClient);

		expect(onAuthStateChange(supabase, callback)).toBe(subscription);
		expect(callback).toHaveBeenCalledWith(session);
	});

	it('gets the current user from the session', async () => {
		const user = createUser();
		const supabase = createSupabase({
			auth: { getSession: vi.fn(async () => ({ data: { session: createSession(user) }, error: null })) }
		} as unknown as SupabaseClient);

		await expect(getCurrentUser(supabase)).resolves.toBe(user);
	});

	it('returns null when there is no current user', async () => {
		const supabase = createSupabase({
			auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: null })) }
		} as unknown as SupabaseClient);

		await expect(getCurrentUser(supabase)).resolves.toBeNull();
	});

	it('loads a profile by id', async () => {
		const profile = createProfile();
		const query = createProfilesQuery({ data: profile, error: null });
		const from = vi.fn(() => query);
		const supabase = createSupabase({ from } as unknown as SupabaseClient);

		await expect(getProfile(supabase, 'user-1')).resolves.toEqual(profile);
		expect(from).toHaveBeenCalledWith('profiles');
		expect(query.select).toHaveBeenCalledWith('id, callsign, grid_square, qth, created_at');
		expect(query.eq).toHaveBeenCalledWith('id', 'user-1');
	});

	it('returns null when profile lookup fails', async () => {
		const query = createProfilesQuery<Profile>({ data: null, error: new Error('Missing profile') });
		const supabase = createSupabase({ from: vi.fn(() => query) } as unknown as SupabaseClient);

		await expect(getProfile(supabase, 'missing-user')).resolves.toBeNull();
	});

	it('updates a profile and returns the updated row', async () => {
		const profile = createProfile({ callsign: 'N0CALL' });
		const query = createProfilesQuery({ data: profile, error: null });
		const supabase = createSupabase({ from: vi.fn(() => query) } as unknown as SupabaseClient);

		await expect(updateProfile(supabase, 'user-1', { callsign: 'N0CALL' })).resolves.toEqual(
			profile
		);
		expect(query.update).toHaveBeenCalledWith({ callsign: 'N0CALL' });
		expect(query.eq).toHaveBeenCalledWith('id', 'user-1');
		expect(query.select).toHaveBeenCalledWith('id, callsign, grid_square, qth, created_at');
	});

	it('throws profile update errors', async () => {
		const error = new Error('Update failed');
		const query = createProfilesQuery<Profile>({ data: null, error });
		const supabase = createSupabase({ from: vi.fn(() => query) } as unknown as SupabaseClient);

		await expect(updateProfile(supabase, 'user-1', { callsign: 'N0CALL' })).rejects.toThrow(error);
	});
});
