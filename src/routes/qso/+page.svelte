<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { settingsStore } from '$lib/ui/stores/settings.svelte';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { BANDS, MODES } from '$lib/logic/types/qso';
  import { getQSOs, deleteQSO } from '$lib/logic/data/qso';
  import type { QSO } from '$lib/logic/types/qso';
  import type { Column } from '$lib/ui/components/DataTable';
  import { buildQSOFilter } from '$lib/ui/utils/filters';

  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import DataTable from '$lib/ui/components/DataTable.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import FilterBar from '$lib/ui/components/FilterBar.svelte';
  import Pagination from '$lib/ui/components/Pagination.svelte';
  import FormInput from '$lib/ui/components/FormInput.svelte';
  import FormSelect from '$lib/ui/components/FormSelect.svelte';
  import FormDate from '$lib/ui/components/FormDate.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import ConfirmDialog from '$lib/ui/components/ConfirmDialog.svelte';
  import { Eye, Pencil, Trash2 } from 'lucide-svelte';
  import { SITE_CONFIG } from '$lib/config';

  const PAGE_SIZE = 25;

  const bandOptions = $derived([{ value: '', label: t.qso.allBands }, ...BANDS.map((b) => ({ value: b, label: b }))]);
  const modeOptions = $derived([{ value: '', label: t.qso.allModes }, ...MODES.map((m) => ({ value: m, label: m }))]);

  const t = $derived(localeStore.translation);

  let filterCallsign = $state('');
  let filterBand = $state('');
  let filterMode = $state('');
  let filterDateFrom = $state('');
  let filterDateTo = $state('');

  let data = $state<QSO[]>([]);
  let total = $state(0);
  let totalPages = $state(0);
  let currentPage = $state(1);
  let loading = $state(true);
  let initialLoaded = $state(false);

  let sortField = $state('time_on');
  let sortDir = $state<'asc' | 'desc'>('desc');

  let deleteTarget = $state<string | null>(null);
  let deleteDialogOpen = $state(false);

  const columns: Column[] = $derived([
    { key: 'time_on', header: t.qso.date, sortable: true, format: (v: unknown) => {
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
    { key: 'callsign', header: t.qso.callsign, sortable: true },
    { key: 'band', header: t.qso.band, sortable: true },
    { key: 'mode', header: t.qso.mode, sortable: true },
    { key: 'rst_sent', header: t.qso.rstSent },
    { key: 'rst_rcvd', header: t.qso.rstRcvd },
    { key: 'country', header: t.qso.country, sortable: true },
  ]);

  async function loadData() {
    loading = true;
    try {
      const result = await getQSOs(supabase, buildQSOFilter({ callsign: filterCallsign, band: filterBand, mode: filterMode, dateFrom: filterDateFrom, dateTo: filterDateTo }), { field: sortField, direction: sortDir }, currentPage, PAGE_SIZE);
      data = result.data;
      total = result.total;
      totalPages = result.totalPages;
    } catch {
      data = [];
      total = 0;
      totalPages = 0;
    } finally {
      loading = false;
      initialLoaded = true;
    }
  }

  $effect(() => {
    loadData();
  });

  function applyFilters() {
    currentPage = 1;
    loadData();
  }

  function clearFilters() {
    filterCallsign = '';
    filterBand = '';
    filterMode = '';
    filterDateFrom = '';
    filterDateTo = '';
    currentPage = 1;
    loadData();
  }

  function handlePage(page: number) {
    currentPage = page;
    loadData();
  }

  function handleSort(key: string, dir: 'asc' | 'desc') {
    sortField = key;
    sortDir = dir;
    loadData();
  }

  function confirmDelete(id: string) {
    deleteTarget = id;
    deleteDialogOpen = true;
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteQSO(supabase, deleteTarget);
    } finally {
      deleteTarget = null;
      loadData();
    }
  }
</script>

<svelte:head>
  <title>{t.qso.title}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<PageHeader title={t.qso.title}>
  {#snippet action()}
    {#if authStore.isAdmin}
      <Button variant="secondary" size="sm" onclick={() => goto('/qso/new')}>{t.qso.newQSO}</Button>
    {/if}
  {/snippet}
</PageHeader>

{#if !initialLoaded}
  <div class="flex justify-center py-[var(--space-12)]">
    <LoadingSpinner size="lg" />
  </div>
{:else if total === 0 && !filterCallsign && !filterBand && !filterMode && !filterDateFrom && !filterDateTo}
  <EmptyState icon="📻" message={t.qso.noQSOsYet}>
    {#snippet cta()}
      {#if authStore.isAdmin}
        <Button variant="primary" onclick={() => goto('/qso/new')}>{t.qso.logYourFirst}</Button>
      {/if}
    {/snippet}
  </EmptyState>
{:else}
  <div class="flex flex-col gap-[var(--space-4)]">
    <FilterBar onclear={clearFilters}>
      <FormInput
        label={t.qso.callsign}
        value={filterCallsign}
        placeholder={t.common.search}
        oninput={(v) => { filterCallsign = v; applyFilters(); }}
      />
      <FormSelect
        label={t.qso.band}
        value={filterBand}
        options={bandOptions}
        onchange={(v) => { filterBand = v; applyFilters(); }}
      />
      <FormSelect
        label={t.qso.mode}
        value={filterMode}
        options={modeOptions}
        onchange={(v) => { filterMode = v; applyFilters(); }}
      />
      <FormDate
        label={t.adif.dateFrom}
        value={filterDateFrom}
        onchange={(v) => { filterDateFrom = v; applyFilters(); }}
      />
      <FormDate
        label={t.adif.dateTo}
        value={filterDateTo}
        onchange={(v) => { filterDateTo = v; applyFilters(); }}
      />
    </FilterBar>

    <DataTable
      {columns}
      data={data as unknown as Record<string, unknown>[]}
      {loading}
      keyExtractor={(row) => row.id as string}
      emptyMessage={t.qso.noQSOsYet}
      sort={{ key: sortField, dir: sortDir }}
      onsort={handleSort}
    >
      {#snippet actions(row)}
        <div class="flex justify-end gap-[var(--space-1)]">
          <button
            class="p-[var(--space-1)] rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] transition-colors"
            aria-label={t.qso.viewQso}
            onclick={() => goto(`/qso/${row.id}`)}
          >
            <Eye size={16} />
          </button>
          {#if authStore.isAdmin}
            <button
              class="p-[var(--space-1)] rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] transition-colors"
              aria-label={t.qso.editQso}
              onclick={() => goto(`/qso/${row.id}/edit`)}
            >
              <Pencil size={16} />
            </button>
            <button
              class="p-[var(--space-1)] rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] transition-colors"
              aria-label={t.qso.deleteQso}
              onclick={() => confirmDelete(row.id as string)}
            >
              <Trash2 size={16} />
            </button>
          {/if}
        </div>
      {/snippet}
    </DataTable>

    {#if data.length > 0}
      <div class="text-[var(--text-aux)] text-[var(--color-text-muted)] font-[var(--font-mono)]">
        {t.qso.totalCount.replace('{total}', String(total))}
      </div>
    {/if}

    {#if totalPages > 1}
      <Pagination
        {currentPage}
        {totalPages}
        onpage={handlePage}
      />
    {/if}
  </div>
{/if}

<ConfirmDialog
  bind:open={deleteDialogOpen}
  title={t.qso.deleteConfirm}
  message={t.qso.deleteMessage}
  confirmLabel={t.common.delete}
  onconfirm={handleDeleteConfirm}
/>
