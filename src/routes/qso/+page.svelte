<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { BANDS, MODES } from '$lib/logic/types/qso';
  import { validateQSO } from '$lib/logic/validation';
  import { createQSO } from '$lib/logic/data/qso';
  import { lookupCallsign } from '$lib/logic/data/callsign';
  import type { QSOInsert, ValidationResult } from '$lib/logic/types/qso';

  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import FormInput from '$lib/ui/components/FormInput.svelte';
  import FormSelect from '$lib/ui/components/FormSelect.svelte';
  import FormDate from '$lib/ui/components/FormDate.svelte';
  import FormTime from '$lib/ui/components/FormTime.svelte';
  import FormToggle from '$lib/ui/components/FormToggle.svelte';
  import CollapsibleSection from '$lib/ui/components/CollapsibleSection.svelte';
  import ValidationErrors from '$lib/ui/components/ValidationErrors.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { SITE_CONFIG } from '$lib/config';

  const PHONE_MODES = new Set(['SSB', 'FM', 'AM']);

  const BAND_FREQ: Record<string, number> = {
    '160m': 1.85, '80m': 3.75, '60m': 5.357, '40m': 7.15,
    '30m': 10.125, '20m': 14.175, '17m': 18.118, '15m': 21.225,
    '12m': 24.94, '10m': 28.5, '6m': 50.15, '4m': 70.15,
    '2m': 145.5, '70cm': 435, '23cm': 1295,
  };

  const FREQ_BAND_RANGES: Array<{ min: number; max: number; band: string }> = [
    { min: 1.8, max: 2.0, band: '160m' },
    { min: 3.5, max: 4.0, band: '80m' },
    { min: 5.0, max: 5.5, band: '60m' },
    { min: 7.0, max: 7.3, band: '40m' },
    { min: 10.0, max: 10.15, band: '30m' },
    { min: 14.0, max: 14.35, band: '20m' },
    { min: 18.0, max: 18.17, band: '17m' },
    { min: 21.0, max: 21.45, band: '15m' },
    { min: 24.0, max: 24.99, band: '12m' },
    { min: 28.0, max: 29.7, band: '10m' },
    { min: 50.0, max: 54.0, band: '6m' },
    { min: 70.0, max: 71.0, band: '4m' },
    { min: 144.0, max: 148.0, band: '2m' },
    { min: 430.0, max: 440.0, band: '70cm' },
    { min: 1240.0, max: 1300.0, band: '23cm' },
  ];

  function freqToBand(freqMhz: number): string {
    for (const r of FREQ_BAND_RANGES) {
      if (freqMhz >= r.min && freqMhz <= r.max) return r.band;
    }
    return '';
  }

  function utcDate(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  }

  function utcTime(): string {
    const now = new Date();
    return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:00`;
  }

  function defaultRST(mode: string): string {
    return PHONE_MODES.has(mode) ? '59' : '599';
  }

  const bandOptions = BANDS.map((b) => ({ value: b, label: b }));
  const modeOptions = MODES.map((m) => ({ value: m, label: m }));

  const t = $derived(localeStore.translation);

  $effect(() => {
    if (!authStore.isAdmin) {
      goto('/');
      toastStore.error(t.auth.adminOnly);
      return;
    }
  });

  let callsign = $state('');
  let qsoDate = $state(utcDate());
  let timeOn = $state(utcTime());
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
  let saved = $state(false);

  let lookupTimer: ReturnType<typeof setTimeout> | null = null;
  let lookingUp = $state(false);

  function handleCallsignInput(value: string) {
    callsign = value;
    saved = false;
    if (lookupTimer) clearTimeout(lookupTimer);
    if (value.trim().length >= 3) {
      lookingUp = true;
      lookupTimer = setTimeout(async () => {
        const info = await lookupCallsign(value);
        if (info) {
          if (info.name && !optName) optName = info.name;
          if (info.grid_square && !optGrid) optGrid = info.grid_square;
          if (info.country) { /* could display but no matching field */ }
        }
        lookingUp = false;
      }, 500);
    } else {
      lookingUp = false;
    }
  }

  function handleBandChange(value: string) {
    band = value;
    saved = false;
    if (value && BAND_FREQ[value]) {
      freq = String(BAND_FREQ[value]);
    }
  }

  function handleFreqInput(value: string) {
    freq = value;
    saved = false;
    const num = parseFloat(value);
    if (!isNaN(num) && !isEyeball) {
      const detected = freqToBand(num);
      if (detected) band = detected;
    }
  }

  function handleModeChange(value: string) {
    const prevMode = mode;
    mode = value;
    saved = false;
    if (prevMode === '' || rstSent === defaultRST(prevMode)) {
      rstSent = defaultRST(value);
    }
    if (prevMode === '' || rstRcvd === defaultRST(prevMode)) {
      rstRcvd = defaultRST(value);
    }
  }

  function buildInsert(): QSOInsert {
    return {
      profile_id: authStore.user?.id ?? '',
      callsign: callsign.trim().toUpperCase(),
      qso_date: qsoDate,
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
    saved = false;

    const insert = buildInsert();
    const result = validateQSO(insert);
    if (!result.valid) {
      errors = result.errors;
      return;
    }

    submitting = true;
    try {
      await createQSO(supabase, insert);
      toastStore.success(t.qso.qsoSaved);
      saved = true;
    } catch (err) {
      toastStore.error(t.qso.saveFailed);
      errors = [{ field: '_submit', code: 'REQUIRED' }];
    } finally {
      submitting = false;
    }
  }

  function logAnother() {
    callsign = '';
    band = '';
    freq = '';
    mode = '';
    rstSent = '';
    rstRcvd = '';
    optName = '';
    optQth = '';
    optGrid = '';
    optPower = '';
    optComment = '';
    optPropMode = '';
    qsoDate = utcDate();
    timeOn = utcTime();
    errors = [];
    saved = false;
  }
</script>

<svelte:head>
  <title>{t.qso.newQSO}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

{#if authStore.isAdmin}
<PageHeader title={t.qso.newQSO} />

{#if saved}
  <div class="flex flex-col sm:flex-row items-center gap-4 py-12">
    <Button variant="primary" onclick={logAnother}>{t.qso.logAnother}</Button>
    <Button variant="secondary" onclick={() => goto('/qso/list')}>{t.qso.viewList}</Button>
  </div>
{:else}
  <form onsubmit={handleSubmit} class="flex flex-col gap-6 pb-24 lg:pb-6">
    <ValidationErrors {errors} namespace="qso" />

    <FormToggle
      label="{t.qso.eyeball} - {t.qso.eyeballDescription}"
      checked={isEyeball}
      onchange={(val) => { isEyeball = val; saved = false; }}
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2">
        <FormInput
          label={t.qso.callsign}
          value={callsign}
          placeholder={t.common.placeholder.callsign}
          required={true}
          oninput={handleCallsignInput}
        />
        {#if lookingUp}
          <span class="text-xs text-[var(--color-text-muted)] mt-1 inline-flex items-center gap-1">
            <LoadingSpinner size="sm" />
          </span>
        {/if}
      </div>

      <FormDate
        label={t.qso.date}
        value={qsoDate}
        required={true}
        onchange={(v) => { qsoDate = v; saved = false; }}
      />

      <FormTime
        label={t.qso.time}
        value={timeOn}
        required={true}
        onchange={(v) => { timeOn = v; saved = false; }}
      />

      {#if !isEyeball}
        <FormSelect
          label={t.qso.band}
          value={band}
          options={bandOptions}
          placeholder={t.common.select.band}
          required={true}
          onchange={handleBandChange}
        />

        <FormInput
          label={t.qso.freq}
          value={freq}
          placeholder={t.common.placeholder.freq}
          oninput={handleFreqInput}
        >
          {#snippet suffix()}
            <span class="text-xs">{t.common.unit.mhz}</span>
          {/snippet}
        </FormInput>
      {/if}

      <FormSelect
        label={t.qso.mode}
        value={mode}
        options={modeOptions}
        placeholder={t.common.select.mode}
        onchange={handleModeChange}
      />

      <div class="grid grid-cols-2 gap-4 sm:col-span-2">
        <FormInput
          label={t.qso.rstSent}
          value={rstSent}
          oninput={(v) => { rstSent = v; saved = false; }}
        />
        <FormInput
          label={t.qso.rstRcvd}
          value={rstRcvd}
          oninput={(v) => { rstRcvd = v; saved = false; }}
        />
      </div>
    </div>

    <CollapsibleSection title={t.qso.optionalFields}>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label={t.qso.name}
          value={optName}
          oninput={(v) => { optName = v; saved = false; }}
        />
        <FormInput
          label={t.qso.qth}
          value={optQth}
          oninput={(v) => { optQth = v; saved = false; }}
        />
        <FormInput
          label={t.qso.gridSquare}
          value={optGrid}
          oninput={(v) => { optGrid = v; saved = false; }}
        />
        <FormInput
          label={t.qso.power}
          value={optPower}
          placeholder={t.common.unit.watts}
          oninput={(v) => { optPower = v; saved = false; }}
        />
        <FormInput
          label={t.qso.propMode}
          value={optPropMode}
          oninput={(v) => { optPropMode = v; saved = false; }}
        />
        <div class="sm:col-span-2">
          <FormInput
            label={t.qso.comment}
            value={optComment}
            oninput={(v) => { optComment = v; saved = false; }}
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
    </div>
  </form>
{/if}
{/if}
