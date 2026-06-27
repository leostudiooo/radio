import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { supabase } from '$lib/supabase';
import { signInWithPasskey, signInWithMagicLink, signOut } from '$lib/logic/auth';
import { getQSOs, getQSOById } from '$lib/logic/data/qso';
import { getEquipment, getEquipmentById, updateEquipment } from '$lib/logic/data/equipment';
import { authStore } from '$lib/ui/stores/auth.svelte';
import operatorData from '$lib/logic/config/operator.json';
import type { AuthCommandResult, AuthStatus, StationOSAdapters } from './types';
import type { Pathname } from '$app/types';

type ResolvablePath = Pathname;

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

				return updateEquipment(supabase, id, { is_active: true });
			},
			async deactivate(id) {
				const item = await getEquipmentById(supabase, id);
				if (!item) throw new Error(`Equipment not found: ${id}`);
				if (!item.is_active) return item;

				return updateEquipment(supabase, id, { is_active: false });
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
				const response = await fetch(`/vfs${path}`);
				if (!response.ok) throw new Error(`${path}: no such file`);
				return response.text();
			}
		}
	};
}
