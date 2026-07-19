<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { toastStore } from '$lib/ui/stores/toast.svelte';
	import AdminGuard from '$lib/ui/components/AdminGuard.svelte';
	import { getQSOById, updateQSO, deleteQSO } from '$lib/logic/data/qso';
	import { runAuthenticated } from '$lib/logic/auth';
	import type { QSO, QSOInsert } from '$lib/logic/types/qso';
	import QSOForm from '$lib/ui/components/QSOForm.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/ui/components/EmptyState.svelte';
	import Button from '$lib/ui/components/Button.svelte';

	const t = $derived(localeStore.translation);
	const id = $derived($page.params.id!);

	let qso: QSO | null = $state(null);
	let loading = $state(true);
	let notFound = $state(false);
	let loadError = $state(false);

	async function loadQSO() {
		loading = true;
		notFound = false;
		loadError = false;
		try {
			const result = await getQSOById(supabase, id);
			if (result) {
				qso = result;
			} else {
				notFound = true;
			}
		} catch {
			loadError = true;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (id) loadQSO();
	});

	async function handleSubmit(data: QSOInsert, signal?: AbortSignal) {
		try {
			const { profile_id, ...update } = data;
			void profile_id;
			await runAuthenticated(
				supabase,
				'update QSO',
				() => updateQSO(supabase, id, update, signal),
				undefined,
				signal
			);
			toastStore.success(t.qso.qsoSaved);
			goto('/qso');
		} catch (err) {
			toastStore.error(t.qso.saveFailed);
			throw err;
		}
	}

	async function handleDelete() {
		try {
			await runAuthenticated(supabase, 'delete QSO', () => deleteQSO(supabase, id));
			toastStore.success(t.common.success);
			goto('/qso');
		} catch (error) {
			toastStore.error(t.qso.saveFailed);
			throw error;
		}
	}
</script>

<AdminGuard>
	{#if loading}
		<div class="flex justify-center py-[var(--space-12)]">
			<LoadingSpinner size="lg" />
		</div>
	{:else if notFound}
		<p class="text-[var(--color-text-muted)] text-[var(--text-body)]">QSO not found.</p>
	{:else if loadError}
		<EmptyState message={t.common.error}>
			{#snippet cta()}<Button variant="secondary" onclick={loadQSO}>{t.common.retry}</Button
				>{/snippet}
		</EmptyState>
	{:else if qso}
		<QSOForm
			formMode="edit"
			initialData={qso}
			profileId={qso.profile_id}
			onsubmit={handleSubmit}
			ondelete={handleDelete}
		/>
	{/if}
</AdminGuard>
