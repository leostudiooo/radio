<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import { EQUIPMENT_TYPES } from '$lib/logic/types/equipment';
  import { getEquipmentById, updateEquipment, deleteEquipment } from '$lib/logic/data/equipment';
  import type { Equipment } from '$lib/logic/types/equipment';

  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import FormInput from '$lib/ui/components/FormInput.svelte';
  import FormSelect from '$lib/ui/components/FormSelect.svelte';
  import FormTextarea from '$lib/ui/components/FormTextarea.svelte';
  import FormToggle from '$lib/ui/components/FormToggle.svelte';
  import ConfirmDialog from '$lib/ui/components/ConfirmDialog.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';

  const typeOptions = EQUIPMENT_TYPES.map((t) => ({ value: t, label: t }));

  const t = $derived(localeStore.translation);
  const id: string = $derived($page.params.id);

  let equipment: Equipment | null = $state(null);
  let loading = $state(true);
  let notFound = $state(false);

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
    try {
      const result = await getEquipmentById(supabase, id);
      if (result) {
        populateForm(result);
      } else {
        notFound = true;
      }
    } catch {
      notFound = true;
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
      await updateEquipment(supabase, id, {
        name: name.trim(),
        type: type as typeof EQUIPMENT_TYPES[number],
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        serial_number: serialNumber.trim() || undefined,
        description: description.trim() || undefined,
        is_active: isActive,
      });
      toastStore.success(t.equipment.equipmentSaved);
      goto('/equipment');
    } catch {
      toastStore.error(t.equipment.saveFailed);
    } finally {
      submitting = false;
    }
  }

  async function handleDelete() {
    try {
      await deleteEquipment(supabase, id);
      toastStore.success(t.common.success);
      goto('/equipment');
    } catch {
      toastStore.error(t.equipment.saveFailed);
    }
  }
</script>

<svelte:head>
  <title>{t.equipment.editEquipment} - BA4VUN</title>
</svelte:head>

{#if loading}
  <div class="flex justify-center py-12">
    <LoadingSpinner size="lg" />
  </div>
{:else if notFound}
  <p class="text-sm text-[var(--color-text-muted)]">Equipment not found.</p>
{:else}
  <PageHeader title={t.equipment.editEquipment}>
    {#snippet action()}
      <Button variant="ghost" size="sm" onclick={() => { showDeleteConfirm = true; }}>{t.common.delete}</Button>
    {/snippet}
  </PageHeader>

  <form onsubmit={handleSubmit} class="flex flex-col gap-6 pb-24 lg:pb-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2">
        <FormInput
          label={t.equipment.name}
          bind:value={name}
          placeholder="e.g. IC-7300"
          required={true}
        />
      </div>

      <FormSelect
        label={t.equipment.type}
        bind:value={type}
        options={typeOptions}
        placeholder="Select type"
        required={true}
      />

      <FormInput
        label={t.equipment.manufacturer}
        bind:value={manufacturer}
        placeholder="e.g. Icom"
      />

      <FormInput
        label={t.equipment.model}
        bind:value={model}
        placeholder="e.g. IC-7300"
      />

      <FormInput
        label={t.equipment.serialNumber}
        bind:value={serialNumber}
        placeholder="e.g. SN12345"
      />

      <div class="sm:col-span-2">
        <FormTextarea
          label={t.equipment.description}
          bind:value={description}
          placeholder="Optional notes about this equipment"
        />
      </div>

      <FormToggle
        label={t.equipment.active}
        bind:checked={isActive}
      />
    </div>

    <div class="flex items-center gap-3">
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
