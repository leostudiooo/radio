<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { toastStore } from '$lib/ui/stores/toast.svelte';
	import AdminGuard from '$lib/ui/components/AdminGuard.svelte';
	import { EQUIPMENT_TYPES } from '$lib/logic/types/equipment';
	import { getEquipmentById, updateEquipment, deleteEquipment } from '$lib/logic/data/equipment';
	import { runAuthenticated } from '$lib/logic/auth';
	import type { Equipment } from '$lib/logic/types/equipment';

	import PageHeader from '$lib/ui/components/PageHeader.svelte';
	import FormInput from '$lib/ui/components/FormInput.svelte';
	import FormSelect from '$lib/ui/components/FormSelect.svelte';
	import FormTextarea from '$lib/ui/components/FormTextarea.svelte';
	import FormToggle from '$lib/ui/components/FormToggle.svelte';
	import ConfirmDialog from '$lib/ui/components/ConfirmDialog.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import EmptyState from '$lib/ui/components/EmptyState.svelte';
	import { SITE_CONFIG } from '$lib/config';

	const typeOptions = EQUIPMENT_TYPES.map((t) => ({ value: t, label: t }));

	const t = $derived(localeStore.translation);
	const id = $derived($page.params.id!);

	let equipment: Equipment | null = $state(null);
	let loading = $state(true);
	let notFound = $state(false);
	let loadError = $state(false);

	let name = $state('');
	let type = $state('');
	let manufacturer = $state('');
	let model = $state('');
	let serialNumber = $state('');
	let description = $state('');
	let isActive = $state(true);

	let submitting = $state(false);
	let showDeleteConfirm = $state(false);

	function populateForm(data: Equipment) {
		equipment = data;
		name = data.name ?? '';
		type = data.type ?? '';
		manufacturer = data.manufacturer ?? '';
		model = data.model ?? '';
		serialNumber = data.serial_number ?? '';
		description = data.description ?? '';
		isActive = data.is_active ?? true;
	}

	async function loadEquipment() {
		loading = true;
		notFound = false;
		loadError = false;
		try {
			const result = await getEquipmentById(supabase, id);
			if (result) {
				populateForm(result);
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
		if (id) loadEquipment();
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		submitting = true;
		try {
			await runAuthenticated(supabase, 'update equipment', () =>
				updateEquipment(supabase, id, {
					name: name.trim(),
					type: type as (typeof EQUIPMENT_TYPES)[number],
					manufacturer: manufacturer.trim() || undefined,
					model: model.trim() || undefined,
					serial_number: serialNumber.trim() || undefined,
					description: description.trim() || undefined,
					is_active: isActive
				})
			);
			toastStore.success(t.equipment.equipmentSaved);
			goto('/equipment');
		} catch (error) {
			toastStore.error(t.equipment.saveFailed);
		} finally {
			submitting = false;
		}
	}

	async function handleDelete() {
		try {
			await runAuthenticated(supabase, 'delete equipment', () => deleteEquipment(supabase, id));
			toastStore.success(t.common.success);
			goto('/equipment');
		} catch (error) {
			toastStore.error(t.equipment.saveFailed);
			throw error;
		}
	}
</script>

<svelte:head>
	<title>{t.equipment.editEquipment}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<AdminGuard>
	{#if loading}
		<div class="flex justify-center py-[var(--space-12)]">
			<LoadingSpinner size="lg" />
		</div>
	{:else if notFound}
		<p class="text-[var(--color-text-muted)] text-[var(--text-body)]">Equipment not found.</p>
	{:else if loadError}
		<EmptyState message={t.common.error}>
			{#snippet cta()}
				<Button variant="secondary" onclick={loadEquipment}>{t.common.retry}</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<PageHeader title={t.equipment.editEquipment}>
			{#snippet action()}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => {
						showDeleteConfirm = true;
					}}>{t.common.delete}</Button
				>
			{/snippet}
		</PageHeader>

		<form onsubmit={handleSubmit} class="flex flex-col gap-[var(--space-6)] pb-24 lg:pb-6">
			<div class="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
				<div class="sm:col-span-2">
					<FormInput
						label={t.equipment.name}
						bind:value={name}
						placeholder={t.equipment.placeholder.name}
						required={true}
					/>
				</div>

				<FormSelect
					label={t.equipment.type}
					bind:value={type}
					options={typeOptions}
					placeholder={t.common.select.type}
					required={true}
				/>

				<FormInput
					label={t.equipment.manufacturer}
					bind:value={manufacturer}
					placeholder={t.equipment.placeholder.manufacturer}
				/>

				<FormInput
					label={t.equipment.model}
					bind:value={model}
					placeholder={t.equipment.placeholder.model}
				/>

				<FormInput
					label={t.equipment.serialNumber}
					bind:value={serialNumber}
					placeholder={t.equipment.placeholder.serialNumber}
				/>

				<div class="sm:col-span-2">
					<FormTextarea
						label={t.equipment.description}
						bind:value={description}
						placeholder={t.equipment.placeholder.notes}
					/>
				</div>

				<FormToggle label={t.equipment.active} bind:checked={isActive} />
			</div>

			<div class="flex items-center gap-[var(--space-3)]">
				<Button type="submit" variant="primary" disabled={submitting}>
					{#if submitting}
						<LoadingSpinner size="sm" />
					{:else}
						{t.common.save}
					{/if}
				</Button>
				<Button variant="ghost" onclick={() => goto('/equipment')}>{t.common.cancel}</Button>
			</div>
		</form>

		<ConfirmDialog
			bind:open={showDeleteConfirm}
			title={t.equipment.deleteConfirm}
			message={t.equipment.deleteMessage}
			confirmLabel={t.common.delete}
			cancelLabel={t.common.cancel}
			onconfirm={handleDelete}
		/>
	{/if}
</AdminGuard>
