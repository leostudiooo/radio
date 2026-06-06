<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { authStore } from '$lib/ui/stores/auth.svelte';
	import { toastStore } from '$lib/ui/stores/toast.svelte';
	import { getEquipment, deleteEquipment, toggleEquipmentActive } from '$lib/logic/data/equipment';
	import type { Equipment } from '$lib/logic/types/equipment';
	import type { Column } from '$lib/ui/components/DataTable';

	import PageHeader from '$lib/ui/components/PageHeader.svelte';
	import DataTable from '$lib/ui/components/DataTable.svelte';
	import EmptyState from '$lib/ui/components/EmptyState.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import ConfirmDialog from '$lib/ui/components/ConfirmDialog.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import { Pencil, Trash2 } from '@lucide/svelte';
	import { SITE_CONFIG } from '$lib/config';

	const t = $derived(localeStore.translation);

	let data = $state<Equipment[]>([]);
	let loading = $state(true);
	let initialLoaded = $state(false);

	let deleteTarget = $state<Equipment | null>(null);
	let showDeleteConfirm = $state(false);

	const columns: Column[] = $derived([
		{ key: 'name', header: t.equipment.name, sortable: true },
		{ key: 'type', header: t.equipment.type, sortable: true },
		{ key: 'manufacturer', header: t.equipment.manufacturer },
		{ key: 'model', header: t.equipment.model },
		{ key: 'is_active', header: t.equipment.active }
	]);

	async function loadData() {
		loading = true;
		try {
			data = await getEquipment(supabase);
		} catch {
			data = [];
		} finally {
			loading = false;
			initialLoaded = true;
		}
	}

	$effect(() => {
		loadData();
	});

	async function handleDelete() {
		if (!deleteTarget?.id) return;
		try {
			await deleteEquipment(supabase, deleteTarget.id);
			data = data.filter((d) => d.id !== deleteTarget!.id);
			toastStore.success(t.common.success);
		} catch {
			toastStore.error(t.equipment.saveFailed);
		} finally {
			deleteTarget = null;
		}
	}

	async function handleToggleActive(item: Equipment) {
		if (!item.id) return;
		try {
			const updated = await toggleEquipmentActive(supabase, item.id);
			data = data.map((d) => (d.id === updated.id ? updated : d));
		} catch {
			toastStore.error(t.equipment.saveFailed);
		}
	}
</script>

<svelte:head>
	<title>{t.equipment.title}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<PageHeader title={t.equipment.title}>
	{#snippet action()}
		{#if authStore.isAdmin}
			<Button variant="secondary" size="sm" onclick={() => goto('/equipment/new')}
				>{t.equipment.newEquipment}</Button
			>
		{/if}
	{/snippet}
</PageHeader>

{#if !initialLoaded}
	<div class="flex justify-center py-[var(--space-12)]">
		<LoadingSpinner size="lg" />
	</div>
{:else if data.length === 0}
	<EmptyState icon="🔧" message={t.equipment.noEquipment}>
		{#snippet cta()}
			{#if authStore.isAdmin}
				<Button variant="primary" onclick={() => goto('/equipment/new')}
					>{t.equipment.addFirst}</Button
				>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<DataTable
		{columns}
		data={data as unknown as Record<string, unknown>[]}
		{loading}
		keyExtractor={(row) => row.id as string}
		emptyMessage={t.equipment.noEquipment}
	>
		{#snippet cell_is_active(row)}
			{#if authStore.isAdmin}
				<button
					type="button"
					class="cursor-pointer font-mono focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
					onclick={() => handleToggleActive(row as unknown as Equipment)}
					aria-label={row.is_active ? t.equipment.deactivate : t.equipment.activate}
				>
					{#if row.is_active}
						<span class="font-mono text-[var(--color-accent)]">[x]</span>
					{:else}
						<span class="font-mono">[ ]</span>
					{/if}
				</button>
			{:else if row.is_active}
				<span class="font-mono text-[var(--color-accent)]">[x]</span>
			{:else}
				<span class="font-mono">[ ]</span>
			{/if}
		{/snippet}
		{#snippet actions(row)}
			{#if authStore.isAdmin}
				<div class="flex items-center justify-end gap-[var(--space-1)]">
					<button
						type="button"
						class="inline-flex items-center justify-center p-[var(--space-1)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
						onclick={() => goto(`/equipment/${row.id}`)}
						aria-label={t.equipment.editItem.replace('{name}', String(row.name ?? ''))}
					>
						<Pencil size={16} />
					</button>
					<button
						type="button"
						class="inline-flex items-center justify-center p-[var(--space-1)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
						onclick={() => {
							deleteTarget = row as unknown as Equipment;
							showDeleteConfirm = true;
						}}
						aria-label={t.equipment.deleteItem.replace('{name}', String(row.name ?? ''))}
					>
						<Trash2 size={16} />
					</button>
				</div>
			{/if}
		{/snippet}
	</DataTable>
{/if}

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title={t.equipment.deleteConfirm}
	message={t.equipment.deleteMessage}
	confirmLabel={t.common.delete}
	cancelLabel={t.common.cancel}
	onconfirm={handleDelete}
	oncancel={() => {
		deleteTarget = null;
	}}
/>
