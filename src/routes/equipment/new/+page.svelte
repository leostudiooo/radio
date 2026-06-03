<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { EQUIPMENT_TYPES } from '$lib/logic/types/equipment';
  import { createEquipment } from '$lib/logic/data/equipment';

  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import FormInput from '$lib/ui/components/FormInput.svelte';
  import FormSelect from '$lib/ui/components/FormSelect.svelte';
  import FormTextarea from '$lib/ui/components/FormTextarea.svelte';
  import FormToggle from '$lib/ui/components/FormToggle.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { SITE_CONFIG } from '$lib/config';

  const typeOptions = EQUIPMENT_TYPES.map((t) => ({ value: t, label: t }));

  const t = $derived(localeStore.translation);

  let name = $state('');
  let type = $state('');
  let manufacturer = $state('');
  let model = $state('');
  let serialNumber = $state('');
  let description = $state('');
  let isActive = $state(true);
  let submitting = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    submitting = true;
    try {
      await createEquipment(supabase, {
        profile_id: authStore.user?.id ?? '',
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
</script>

<svelte:head>
  <title>{t.equipment.newEquipment}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<PageHeader title={t.equipment.newEquipment} />

<form onsubmit={handleSubmit} class="flex flex-col gap-6 pb-24 lg:pb-6">
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div class="sm:col-span-2">
      <FormInput
        label={t.equipment.name}
        value={name}
        placeholder="e.g. IC-7300"
        required={true}
        oninput={(v) => { name = v; }}
      />
    </div>

    <FormSelect
      label={t.equipment.type}
      value={type}
      options={typeOptions}
      placeholder="Select type"
      required={true}
      onchange={(v) => { type = v; }}
    />

    <FormInput
      label={t.equipment.manufacturer}
      value={manufacturer}
      placeholder="e.g. Icom"
      oninput={(v) => { manufacturer = v; }}
    />

    <FormInput
      label={t.equipment.model}
      value={model}
      placeholder="e.g. IC-7300"
      oninput={(v) => { model = v; }}
    />

    <FormInput
      label={t.equipment.serialNumber}
      value={serialNumber}
      placeholder="e.g. SN12345"
      oninput={(v) => { serialNumber = v; }}
    />

    <div class="sm:col-span-2">
      <FormTextarea
        label={t.equipment.description}
        value={description}
        placeholder="Optional notes about this equipment"
        oninput={(v) => { description = v; }}
      />
    </div>

    <FormToggle
      label={t.equipment.active}
      checked={isActive}
      onchange={(val) => { isActive = val; }}
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
