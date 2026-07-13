<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { toastStore } from '$lib/ui/stores/toast.svelte';
	import { authStore } from '$lib/ui/stores/auth.svelte';
	import { createQSO, getQSOs } from '$lib/logic/data/qso';
	import { getEquipment } from '$lib/logic/data/equipment';
	import type { QSO, QSOInsert } from '$lib/logic/types/qso';
	import type { Equipment } from '$lib/logic/types/equipment';
	import QSOForm from '$lib/ui/components/QSOForm.svelte';
	import AdminGuard from '$lib/ui/components/AdminGuard.svelte';

	const t = $derived(localeStore.translation);
	let recentQSOs = $state<QSO[]>([]);
	let activeEquipment = $state<Equipment[]>([]);

	onMount(() => {
		async function loadQuickLogHints() {
			try {
				const [qsoResult, equipmentResult] = await Promise.all([
					getQSOs(supabase, {}, { field: 'time_on', direction: 'desc' }, 1, 12),
					getEquipment(supabase, true)
				]);
				recentQSOs = qsoResult.data;
				activeEquipment = equipmentResult;
			} catch {
				recentQSOs = [];
				activeEquipment = [];
			}
		}

		void loadQuickLogHints();
	});

	async function handleSubmit(data: QSOInsert) {
		try {
			await createQSO(supabase, data);
			toastStore.success(t.qso.qsoSaved);
		} catch (err) {
			toastStore.error(t.qso.saveFailed);
			throw err;
		}
	}
</script>

<AdminGuard>
	<QSOForm
		formMode="create"
		profileId={authStore.user?.id ?? ''}
		profileQth={authStore.profile?.qth ?? ''}
		{recentQSOs}
		{activeEquipment}
		onsubmit={handleSubmit}
	/>
</AdminGuard>
