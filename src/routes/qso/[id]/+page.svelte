<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { BANDS, MODES } from '$lib/logic/types/qso';
  import { validateQSO } from '$lib/logic/validation';
  import { getQSOById, updateQSO, deleteQSO } from '$lib/logic/data/qso';
  import type { QSO, QSOUpdate, ValidationResult } from '$lib/logic/types/qso';

  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import FormInput from '$lib/ui/components/FormInput.svelte';
  import FormSelect from '$lib/ui/components/FormSelect.svelte';
  import FormDate from '$lib/ui/components/FormDate.svelte';
  import FormTime from '$lib/ui/components/FormTime.svelte';
  import FormToggle from '$lib/ui/components/FormToggle.svelte';
  import CollapsibleSection from '$lib/ui/components/CollapsibleSection.svelte';
  import ValidationErrors from '$lib/ui/components/ValidationErrors.svelte';
  import ConfirmDialog from '$lib/ui/components/ConfirmDialog.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { SITE_CONFIG } from '$lib/config';

  const bandOptions = BANDS.map((b) => ({ value: b, label: b }));
  const modeOptions = MODES.map((m) => ({ value: m, label: m }));

  const t = $derived(localeStore.translation);
  const id: string = $derived($page.params.id);

  $effect(() => {
    if (!authStore.isAdmin) {
      goto('/');
      toastStore.error(t.auth.adminOnly);
      return;
    }
  });

  let qso: QSO | null = $state(null);
  let loading = $state(true);
  let notFound = $state(false);

  let callsign = $state('');
  let timeOn = $state('');
  let band = $state('');
  let freq = $state('');
  let mode = $state('');
  let rstSent = $state('');
  let rstRcvd = $state('');
  let isEyeball = $state(false);

  let optName = $state('');
  let optQth = $state('');
  let optGrid = $state('');
  let optPower = $state('');
  let optComment = $state('');
  let optPropMode = $state('');

  let errors = $state<ValidationResult['errors']>([]);
  let submitting = $state(false);
  let showDeleteConfirm = $state(false);

  let datePart = $derived(timeOn.slice(0, 10));
  let timePart = $derived(timeOn.slice(11, 16));

  function handleDateChange(newDate: string) {
    timeOn = `${newDate}T${timePart}:00Z`;
  }

  function handleTimeChange(newTime: string) {
    timeOn = `${datePart}T${newTime}:00Z`;
  }

  function populateForm(data: QSO) {
    qso = data;
    callsign = data.callsign ?? '';
    timeOn = data.time_on ?? '';
    band = data.band ?? '';
    freq = data.freq != null ? String(data.freq) : '';
    mode = data.mode ?? '';
    rstSent = data.rst_sent ?? '';
    rstRcvd = data.rst_rcvd ?? '';
    isEyeball = data.is_eyeball ?? false;
    optName = data.name ?? '';
    optQth = data.qth ?? '';
    optGrid = data.grid_square ?? '';
    optPower = data.tx_pwr != null ? String(data.tx_pwr) : '';
    optComment = data.comment ?? '';
    optPropMode = data.prop_mode ?? '';
  }

  async function loadQSO() {
    loading = true;
    notFound = false;
    try {
      const result = await getQSOById(supabase, id);
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
    if (id) loadQSO();
  });

  function buildUpdate(): QSOUpdate {
    return {
      callsign: callsign.trim().toUpperCase(),
      time_on: timeOn,
      band: isEyeball ? undefined : (band || undefined),
      freq: isEyeball ? undefined : (freq ? parseFloat(freq) : undefined),
      mode: mode || undefined,
      rst_sent: rstSent || undefined,
      rst_rcvd: rstRcvd || undefined,
      is_eyeball: isEyeball,
      name: optName || undefined,
      qth: optQth || undefined,
      grid_square: optGrid || undefined,
      tx_pwr: optPower ? parseInt(optPower, 10) : undefined,
      comment: optComment || undefined,
      prop_mode: optPropMode || undefined,
    };
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errors = [];

    const insert = {
      profile_id: qso?.profile_id ?? '',
      callsign: callsign.trim().toUpperCase(),
      time_on: timeOn,
      band: isEyeball ? undefined : (band || undefined),
      freq: isEyeball ? undefined : (freq ? parseFloat(freq) : undefined),
      mode: mode || undefined,
      rst_sent: rstSent || undefined,
      rst_rcvd: rstRcvd || undefined,
      is_eyeball: isEyeball,
      name: optName || undefined,
      qth: optQth || undefined,
      grid_square: optGrid || undefined,
      tx_pwr: optPower ? parseInt(optPower, 10) : undefined,
      comment: optComment || undefined,
      prop_mode: optPropMode || undefined,
    };

    const result = validateQSO(insert);
    if (!result.valid) {
      errors = result.errors;
      return;
    }

    submitting = true;
    try {
      await updateQSO(supabase, id, buildUpdate());
      toastStore.success(t.qso.qsoSaved);
      goto('/qso/list');
    } catch {
      toastStore.error(t.qso.saveFailed);
    } finally {
      submitting = false;
    }
  }

  async function handleDelete() {
    try {
      await deleteQSO(supabase, id);
      toastStore.success(t.common.success);
      goto('/qso/list');
    } catch {
      toastStore.error(t.qso.saveFailed);
    }
  }
</script>

<svelte:head>
  <title>{t.qso.editQSO}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

{#if authStore.isAdmin}

{#if loading}
  <div class="flex justify-center py-12">
    <LoadingSpinner size="lg" />
  </div>
{:else if notFound}
  <p class="text-sm text-[var(--color-text-muted)]">QSO not found.</p>
{:else}
  <PageHeader title={t.qso.editQSO}>
    {#snippet action()}
      <Button variant="ghost" size="sm" onclick={() => { showDeleteConfirm = true; }}>{t.common.delete}</Button>
    {/snippet}
  </PageHeader>

  <form onsubmit={handleSubmit} class="flex flex-col gap-6 pb-24 lg:pb-6">
    <ValidationErrors {errors} namespace="qso" />

    <FormToggle
      label="{t.qso.eyeball} - {t.qso.eyeballDescription}"
      checked={isEyeball}
      onchange={(val) => { isEyeball = val; }}
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2">
        <FormInput
          label={t.qso.callsign}
          bind:value={callsign}
          placeholder={t.common.placeholder.callsign}
          required={true}
        />
      </div>

      <FormDate
        label={t.qso.date}
        value={datePart}
        required={true}
        onchange={handleDateChange}
      />

      <FormTime
        label={t.qso.time}
        value={timePart}
        required={true}
        onchange={handleTimeChange}
      />

      {#if !isEyeball}
        <FormSelect
          label={t.qso.band}
          bind:value={band}
          options={bandOptions}
          placeholder={t.common.select.band}
          required={true}
        />

        <FormInput
          label={t.qso.freq}
          bind:value={freq}
          placeholder={t.common.placeholder.freq}
        >
          {#snippet suffix()}
            <span class="text-xs">{t.common.unit.mhz}</span>
          {/snippet}
        </FormInput>
      {/if}

      <FormSelect
        label={t.qso.mode}
        bind:value={mode}
        options={modeOptions}
        placeholder={t.common.select.mode}
      />

      <div class="grid grid-cols-2 gap-4 sm:col-span-2">
        <FormInput
          label={t.qso.rstSent}
          bind:value={rstSent}
        />
        <FormInput
          label={t.qso.rstRcvd}
          bind:value={rstRcvd}
        />
      </div>
    </div>

    <CollapsibleSection title={t.qso.optionalFields}>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label={t.qso.name}
          bind:value={optName}
        />
        <FormInput
          label={t.qso.qth}
          bind:value={optQth}
        />
        <FormInput
          label={t.qso.gridSquare}
          bind:value={optGrid}
        />
        <FormInput
          label={t.qso.power}
          bind:value={optPower}
          placeholder={t.common.unit.watts}
        />
        <FormInput
          label={t.qso.propMode}
          bind:value={optPropMode}
        />
        <div class="sm:col-span-2">
          <FormInput
            label={t.qso.comment}
            bind:value={optComment}
          />
        </div>
      </div>
    </CollapsibleSection>

    <div class="flex items-center gap-3">
      <Button type="submit" variant="primary" disabled={submitting}>
        {#if submitting}
          <LoadingSpinner size="sm" />
        {:else}
          {t.common.save}
        {/if}
      </Button>
      <Button variant="ghost" onclick={() => goto('/qso/list')}>{t.common.cancel}</Button>
    </div>
  </form>

  <ConfirmDialog
    bind:open={showDeleteConfirm}
    title={t.qso.deleteConfirm}
    message={t.qso.deleteMessage}
    confirmLabel={t.common.delete}
    cancelLabel={t.common.cancel}
    onconfirm={handleDelete}
  />
{/if}
{/if}
