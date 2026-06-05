import { describe, expect, it } from 'vitest';
import { useAdminRoute, useAuthRoute } from './guards.svelte';
import type { AuthStoreLike } from './guards.svelte';

function createMockStore(overrides: Partial<AuthStoreLike> = {}): AuthStoreLike {
	return {
		loading: false,
		isAuthenticated: false,
		isAdmin: false,
		...overrides
	};
}

describe('useAdminRoute', () => {
	it('returns loading when auth store is loading', () => {
		const store = createMockStore({ loading: true });
		expect(useAdminRoute(store)).toBe('loading');
	});

	it('returns not-authenticated when user is not logged in', () => {
		const store = createMockStore({ loading: false, isAuthenticated: false });
		expect(useAdminRoute(store)).toBe('not-authenticated');
	});

	it('returns not-admin when user is logged in but not admin', () => {
		const store = createMockStore({ loading: false, isAuthenticated: true, isAdmin: false });
		expect(useAdminRoute(store)).toBe('not-admin');
	});

	it('returns admin when user is admin', () => {
		const store = createMockStore({ loading: false, isAuthenticated: true, isAdmin: true });
		expect(useAdminRoute(store)).toBe('admin');
	});
});

describe('useAuthRoute', () => {
	it('returns loading when auth store is loading', () => {
		const store = createMockStore({ loading: true });
		expect(useAuthRoute(store)).toBe('loading');
	});

	it('returns not-authenticated when user is not logged in', () => {
		const store = createMockStore({ loading: false, isAuthenticated: false });
		expect(useAuthRoute(store)).toBe('not-authenticated');
	});

	it('returns authenticated when user is logged in', () => {
		const store = createMockStore({ loading: false, isAuthenticated: true });
		expect(useAuthRoute(store)).toBe('authenticated');
	});
});
