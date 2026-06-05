<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { settingsStore } from '$lib/ui/stores/settings.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import { parseADIF, exportADIF } from '$lib/logic/adif';
  import { bulkCreateQSOs, getQSOs } from '$lib/logic/data/qso';
  import { BANDS, MODES } from '$lib/logic/types/qso';
  import type { QSOInsert, QSO } from '$lib/logic/types/qso';
  import type { Column } from '$lib/ui/components/DataTable';
  import { buildQSOFilter } from '$lib/ui/utils/filters';

  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import DataTable from '$lib/ui/components/DataTable.svelte';
  import FileUpload from '$lib/ui/components/FileUpload.svelte';
  import SegmentedToggle from '$lib/ui/components/SegmentedToggle.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import FormInput from '$lib/ui/components/FormInput.svelte';
  import FormSelect from '$lib/ui/components/FormSelect.svelte';
  import FormDate from '$lib/ui/components/FormDate.svelte';
  import CollapsibleSection from '$lib/ui/components/CollapsibleSection.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { SITE_CONFIG } from '$lib/config';
  import { requireAdmin } from '$lib/logic/auth';

  const bandOptions = $derived([{ value: '', label: t.qso.allBands }, ...BANDS.map((b) => ({ value: b, label: b }))]);
  const modeOptions = $derived([{ value: '', label: t.qso.allModes }, ...MODES.map((m) => ({ value: m, label: m }))]);

  const t = $derived(localeStore.translation);

  $effect(() => {
    requireAdmin(authStore, goto, toastStore, t.auth.adminOnly);
  });

  type ImportStep = 'upload' | 'preview' | 'result';
  type ActiveTab = 'import' | 'export';

  let activeTab = $state<ActiveTab>('import');
  let importStep = $state<ImportStep>('upload');
  let parsedQSOs = $state<QSOInsert[]>([]);
  let importSuccess = $state(0);
  let importErrors = $state(0);
  let importing = $state(false);

  let filterCallsign = $state('');
  let filterBand = $state('');
  let filterMode = $state('');
  let filterDateFrom = $state('');
  let filterDateTo = $state('');
  let exporting = $state(false);

  const previewColumns: Column[] = $derived([
    { key: 'callsign', header: t.qso.callsign },
    { key: 'time_on', header: t.qso.date, format: (v: unknown) => {
      const iso = String(v ?? '');
      if (!iso) return '';
      if (!settingsStore.useLocalTime) return iso.slice(0, 10);
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }},
    { key: 'time_on', header: t.qso.time, format: (v: unknown) => {
      const iso = String(v ?? '');
      if (!iso) return '';
      if (!settingsStore.useLocalTime) {
        const m = iso.match(/T(\d{2}:\d{2})/);
        return m ? m[1] : '';
      }
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }},
    { key: 'band', header: t.qso.band },
    { key: 'mode', header: t.qso.mode },
  ]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        const qsos = parseADIF(text);
        if (qsos.length === 0) {
          toastStore.error(t.adif.parseError);
          return;
        }
        parsedQSOs = qsos;
        importStep = 'preview';
      } catch {
        toastStore.error(t.adif.parseError);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    importing = true;
    try {
      const result = await bulkCreateQSOs(supabase, parsedQSOs);
      importSuccess = result.success.length;
      importErrors = result.errors.length;
      importStep = 'result';
      toastStore.success(t.adif.importResult
        .replace('{success}', String(importSuccess))
        .replace('{errors}', String(importErrors)));
    } catch {
      toastStore.error(t.common.error);
    } finally {
      importing = false;
    }
  }

  function resetImport() {
    importStep = 'upload';
    parsedQSOs = [];
    importSuccess = 0;
    importErrors = 0;
  }

  async function handleExport() {
    exporting = true;
    try {
      const result = await getQSOs(
        supabase,
        buildQSOFilter({ callsign: filterCallsign, band: filterBand, mode: filterMode, dateFrom: filterDateFrom, dateTo: filterDateTo }),
        { field: 'time_on', direction: 'desc' },
        1,
        10000,
      );
      const qsos = result.data as QSO[];

      if (qsos.length === 0) {
        toastStore.info(t.adif.noQSOsToExport);
        return;
      }

      const adifContent = exportADIF(qsos);
      const now = new Date();
      const dateStr = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('');
      const filename = `${SITE_CONFIG.callsign}_qso_${dateStr}.adif`;

      const blob = new Blob([adifContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toastStore.success(t.adif.exported.replace('{count}', String(qsos.length)));
    } catch {
      toastStore.error(t.common.error);
    } finally {
      exporting = false;
    }
  }
</script>

<svelte:head>
  <title>{t.adif.importTitle} / {t.adif.exportTitle}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

{#if authStore.isAdmin}
<PageHeader title={t.adif.title} />

<div class="mb-[var(--space-6)]">
  <SegmentedToggle
    options={[{ value: 'import', label: t.adif.importTitle }, { value: 'export', label: t.adif.exportTitle }]}
    value={activeTab}
    onchange={(v) => { activeTab = v; }}
  />
</div>

{#if activeTab === 'import'}
  <div class="flex gap-[var(--space-2)] mb-[var(--space-6)]">
    {#each [['upload', t.adif.importStep1], ['preview', t.adif.importStep2], ['result', t.adif.importStep3]] as [step, label], i}
      <div class="flex items-center gap-[var(--space-2)]">
        <span
          class="inline-flex items-center justify-center w-6 h-6 text-[var(--text-aux)] font-medium"
          style={importStep === step ? 'color: var(--color-text-on-accent)' : ''}
          class:bg-[var(--color-accent)]={importStep === step}
          class:bg-[var(--color-surface)]={importStep !== step}
          class:text-[var(--color-text-muted)]={importStep !== step}
          class:border={importStep !== step}
          class:border-[var(--color-border)]={importStep !== step}
        >{i + 1}</span>
        <span
          class="text-[var(--text-body)]"
          class:text-[var(--color-text-primary)]={importStep === step}
          class:text-[var(--color-text-muted)]={importStep !== step}
        >{label}</span>
      </div>
      {#if i < 2}
        <span class="text-[var(--color-text-muted)] self-center mx-[var(--space-1)]">/</span>
      {/if}
    {/each}
  </div>

  {#if importStep === 'upload'}
    <div class="max-w-lg">
      <FileUpload accept=".adi,.adif" onfile={handleFile} />
    </div>
  {:else if importStep === 'preview'}
    <div class="flex flex-col gap-[var(--space-4)]">
      <p class="text-[var(--text-body)] text-[var(--color-text-secondary)]">
        {t.adif.foundInFile.replace('{count}', String(parsedQSOs.length))}
      </p>

      <DataTable
        columns={previewColumns}
        data={(parsedQSOs.slice(0, 10) as unknown) as Record<string, unknown>[]}
        keyExtractor={(_row, i) => String(i)}
        emptyMessage=""
      />

      {#if parsedQSOs.length > 10}
        <p class="text-[var(--text-aux)] text-[var(--color-text-muted)]">
          {t.adif.showingFirstOf.replace('{count}', '10').replace('{total}', String(parsedQSOs.length))}
        </p>
      {/if}

      <div class="flex gap-[var(--space-3)]">
        <Button variant="primary" onclick={handleImport} disabled={importing}>
          {importing ? t.common.loading : t.adif.importAll}
        </Button>
        <Button variant="secondary" onclick={resetImport}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  {:else if importStep === 'result'}
    <div class="flex flex-col gap-[var(--space-4)]">
      <p class="text-[var(--text-body)] text-[var(--color-text-secondary)]">
        {t.adif.importResult
          .replace('{success}', String(importSuccess))
          .replace('{errors}', String(importErrors))}
      </p>

      <div class="flex gap-[var(--space-4)]">
        <div class="flex flex-col gap-[var(--space-1)] px-[var(--space-4)] py-[var(--space-3)] card-panel">
          <span class="text-[var(--text-title)] font-semibold text-[var(--color-text-primary)]">{importSuccess}</span>
          <span class="text-[var(--text-aux)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.adif.importedLabel}</span>
        </div>
        {#if importErrors > 0}
          <div class="flex flex-col gap-[var(--space-1)] px-[var(--space-4)] py-[var(--space-3)] card-panel">
            <span class="text-[var(--text-title)] font-semibold text-[var(--color-status-invalid)]">{importErrors}</span>
            <span class="text-[var(--text-aux)] text-[var(--color-text-muted)] uppercase tracking-wide">{t.adif.errorsLabel}</span>
          </div>
        {/if}
      </div>

      <Button variant="secondary" onclick={resetImport}>
        {t.adif.done}
      </Button>
    </div>
  {/if}
{:else if activeTab === 'export'}
  <div class="flex flex-col gap-[var(--space-6)] max-w-2xl">
    <CollapsibleSection title={t.adif.filterDescription}>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--space-3)]">
        <FormInput
          label={t.qso.callsign}
          value={filterCallsign}
          placeholder={t.common.search}
          oninput={(v) => { filterCallsign = v; }}
        />
        <FormSelect
          label={t.qso.band}
          value={filterBand}
          options={bandOptions}
          onchange={(v) => { filterBand = v; }}
        />
        <FormSelect
          label={t.qso.mode}
          value={filterMode}
          options={modeOptions}
          onchange={(v) => { filterMode = v; }}
        />
        <FormDate
          label={t.adif.dateFrom}
          value={filterDateFrom}
          onchange={(v) => { filterDateFrom = v; }}
        />
        <FormDate
          label={t.adif.dateTo}
          value={filterDateTo}
          onchange={(v) => { filterDateTo = v; }}
        />
      </div>
    </CollapsibleSection>

    <Button variant="primary" onclick={handleExport} disabled={exporting}>
      {exporting ? t.common.loading : t.adif.exportADIF}
    </Button>
  </div>
{/if}
{/if}
