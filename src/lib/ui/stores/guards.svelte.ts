/**
 * Minimal interface for auth store properties needed by guard functions.
 * This allows guard functions to be tested with mock objects.
 */
export interface AuthStoreLike {
	readonly loading: boolean;
	readonly isAuthenticated: boolean;
	readonly isAdmin: boolean;
	readonly error?: unknown;
}

/** Status returned by useAdminRoute() */
export type AdminGuardStatus = 'loading' | 'admin' | 'not-admin' | 'not-authenticated' | 'error';

/** Status returned by useAuthRoute() */
export type AuthRouteStatus = 'loading' | 'authenticated' | 'not-authenticated';

/**
 * Pure function that determines the admin route access status.
 * No side effects — does not navigate, show toasts, or modify state.
 */
export function useAdminRoute(store: AuthStoreLike): AdminGuardStatus {
	if (store.loading) return 'loading';
	if (store.error) return 'error';
	if (!store.isAuthenticated) return 'not-authenticated';
	if (!store.isAdmin) return 'not-admin';
	return 'admin';
}

/**
 * Pure function that determines the auth route access status.
 * No side effects — does not navigate, show toasts, or modify state.
 */
export function useAuthRoute(store: AuthStoreLike): AuthRouteStatus {
	if (store.loading) return 'loading';
	if (!store.isAuthenticated) return 'not-authenticated';
	return 'authenticated';
}
