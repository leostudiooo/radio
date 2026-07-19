import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { supabase } from '$lib/supabase';
import { runAuthenticated, signInWithPasskey, signInWithMagicLink, signOut } from '$lib/logic/auth';
import { getQSOs, getQSOById } from '$lib/logic/data/qso';
import { getEquipment, getEquipmentById, updateEquipment } from '$lib/logic/data/equipment';
import { authStore } from '$lib/ui/stores/auth.svelte';
import operatorData from '$lib/logic/config/operator.json';
import type { AuthCommandResult, AuthStatus, StationOSAdapters } from './types';
import type { Pathname } from '$app/types';
import { HTTP_DEADLINE_MS, withDeadline } from '$lib/logic/deadline';
import { AppError } from '$lib/logic/errors';

type ResolvablePath = Pathname;

const AUTH_SETTLE_TIMEOUT_MS = 2000;
const AUTH_SETTLE_POLL_MS = 50;

function authStatus(): AuthStatus {
	const isAuthenticated = authStore.isAuthenticated;
	const isAdmin = authStore.isAdmin;

	return {
		loading: authStore.loading,
		isAuthenticated,
		isAdmin,
		role: authStore.loading ? 'loading' : isAdmin ? 'admin' : isAuthenticated ? 'user' : 'guest',
		callsign: authStore.callsign,
		email: authStore.user?.email ?? null,
		userId: authStore.user?.id ?? null
	};
}

async function waitForAuthStoreSettled(): Promise<void> {
	const deadline = Date.now() + AUTH_SETTLE_TIMEOUT_MS;
	while (Date.now() < deadline) {
		if (authStore.isAuthenticated && authStore.callsign) return;
		await new Promise((r) => setTimeout(r, AUTH_SETTLE_POLL_MS));
	}
	throw new AppError('timeout', 'settle authentication', 'Authentication did not settle in time', {
		retryable: true
	});
}

export function createBrowserStationOSAdapters(emit: (text: string) => void): StationOSAdapters {
	return {
		emit,
		sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
		auth: {
			status: authStatus,
			async loginWithPasskey(): Promise<AuthCommandResult> {
				const result = await signInWithPasskey(supabase);
				if (!result.success) {
					return {
						success: false,
						error: result.error,
						errorCode: result.errorCode
					};
				}
				await waitForAuthStoreSettled();
				return { success: true };
			},
			async loginWithMagicLink(email: string): Promise<AuthCommandResult> {
				const redirectTo = `${window.location.origin}/auth/callback`;
				const result = await signInWithMagicLink(supabase, email, redirectTo);
				if (!result.success) {
					return {
						success: false,
						error: result.error,
						errorCode: result.errorCode
					};
				}
				return { success: true };
			},
			async logout() {
				await signOut(supabase);
			}
		},
		router: {
			goto: (path) => goto(resolve(path as ResolvablePath))
		},
		qso: {
			list: () => getQSOs(supabase, {}, { field: 'time_on', direction: 'desc' }, 1, 25),
			get: (id) => getQSOById(supabase, id),
			navigateList: () => goto(resolve('/qso')),
			navigateView: (id) => goto(resolve('/qso/[id]', { id })),
			navigateAdd: () => goto(resolve('/qso/new')),
			navigateEdit: (id) => goto(resolve('/qso/[id]/edit', { id }))
		},
		equipment: {
			list: () => getEquipment(supabase),
			get: (id) => getEquipmentById(supabase, id),
			async activate(id) {
				const item = await getEquipmentById(supabase, id);
				if (!item) throw new Error(`Equipment not found: ${id}`);
				if (item.is_active) return item;

				return runAuthenticated(supabase, 'activate equipment', () =>
					updateEquipment(supabase, id, { is_active: true })
				);
			},
			async deactivate(id) {
				const item = await getEquipmentById(supabase, id);
				if (!item) throw new Error(`Equipment not found: ${id}`);
				if (!item.is_active) return item;

				return runAuthenticated(supabase, 'deactivate equipment', () =>
					updateEquipment(supabase, id, { is_active: false })
				);
			},
			navigateList: () => goto(resolve('/equipment')),
			navigateView: (id) => goto(resolve('/equipment/[id]', { id })),
			navigateAdd: () => goto(resolve('/equipment/new')),
			navigateEdit: (id) => goto(resolve('/equipment/[id]', { id }))
		},
		station: {
			operatorInfo: () => operatorData
		},
		fs: {
			read: async (path) => {
				const response = await withDeadline('read virtual file', HTTP_DEADLINE_MS, (signal) =>
					fetch(`/vfs${path}`, { signal })
				);
				if (!response.ok) throw new Error(`${path}: no such file`);
				return response.text();
			}
		}
	};
}
