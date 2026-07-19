import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockGetSession, mockGetProfile, mockOnAuthStateChange } = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockGetProfile: vi.fn(),
	mockOnAuthStateChange: vi.fn(() => ({ unsubscribe: vi.fn() }))
}));

vi.mock('$lib/supabase', () => ({
	supabase: {
		auth: {
			getSession: mockGetSession,
			onAuthStateChange: vi.fn(() => ({
				data: { subscription: { unsubscribe: vi.fn() } }
			}))
		}
	}
}));

vi.mock('$lib/logic/auth', () => ({
	getProfile: mockGetProfile,
	getSession: async () => {
		const { data, error } = await mockGetSession();
		if (error) throw error;
		return data.session;
	},
	onAuthStateChange: mockOnAuthStateChange
}));

function createMockSession(userId: string) {
	return {
		access_token: 'test-token',
		token_type: 'bearer',
		expires_in: 3600,
		expires_at: 9_999_999_999,
		refresh_token: 'test-refresh',
		user: { id: userId }
	};
}

function createMockProfile(overrides: { role?: 'admin' | 'user'; callsign?: string } = {}) {
	return {
		id: 'user-1',
		callsign: overrides.callsign ?? 'K1ABC',
		role: overrides.role ?? 'user',
		created_at: '2026-01-01T00:00:00.000Z'
	};
}

describe('authStore', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.resetModules();
	});

	it('exports loading that starts as true and becomes false after init (no session)', async () => {
		let deferredResolve: (value: unknown) => void;

		mockGetSession.mockImplementation(
			() =>
				new Promise((resolve) => {
					deferredResolve = resolve;
				})
		);
		mockGetProfile.mockResolvedValue(null);

		const { authStore: store } = await import('./auth.svelte');

		expect(store.loading).toBe(true);
		expect(store.isAuthenticated).toBe(false);
		expect(store.isAdmin).toBe(false);

		deferredResolve!({ data: { session: null }, error: null });
		await vi.waitFor(() => expect(store.loading).toBe(false));

		expect(store.isAuthenticated).toBe(false);
		expect(store.isAdmin).toBe(false);
	});

	it('sets isAuthenticated and isAdmin when session has admin profile', async () => {
		let deferredResolve: (value: unknown) => void;

		mockGetSession.mockImplementation(
			() =>
				new Promise((resolve) => {
					deferredResolve = resolve;
				})
		);
		mockGetProfile.mockResolvedValue(createMockProfile({ role: 'admin' }));

		const { authStore: store } = await import('./auth.svelte');

		expect(store.loading).toBe(true);

		deferredResolve!({
			data: { session: createMockSession('user-1') },
			error: null
		});
		await vi.waitFor(() => expect(store.loading).toBe(false));

		expect(store.isAuthenticated).toBe(true);
		expect(store.isAdmin).toBe(true);
	});

	it('sets isAuthenticated but not isAdmin when session has non-admin profile', async () => {
		let deferredResolve: (value: unknown) => void;

		mockGetSession.mockImplementation(
			() =>
				new Promise((resolve) => {
					deferredResolve = resolve;
				})
		);
		mockGetProfile.mockResolvedValue(createMockProfile({ role: 'user' }));

		const { authStore: store } = await import('./auth.svelte');

		expect(store.loading).toBe(true);

		deferredResolve!({
			data: { session: createMockSession('user-1') },
			error: null
		});
		await vi.waitFor(() => expect(store.loading).toBe(false));

		expect(store.isAuthenticated).toBe(true);
		expect(store.isAdmin).toBe(false);
	});

	it('provides expected getters on the store', async () => {
		mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
		mockGetProfile.mockResolvedValue(null);

		const { authStore: store } = await import('./auth.svelte');
		await vi.waitFor(() => expect(store.loading).toBe(false));

		expect(typeof store.loading).toBe('boolean');
		expect(typeof store.isAuthenticated).toBe('boolean');
		expect(typeof store.isAdmin).toBe('boolean');
		expect(typeof store.refreshProfile).toBe('function');
	});
});
