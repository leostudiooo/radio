<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { BANDS, MODES } from '$lib/logic/types/qso';
  import { getQSOs } from '$lib/logic/data/qso';
  import type { QSO, QSOFilter } from '$lib/logic/types/qso';
  import type { Column } from '$lib/ui/components/DataTable';

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
  import { Radio } from 'lucide-svelte';
  import { SITE_CONFIG } from '$lib/config';

  const PAGE_SIZE = 25;

  const bandOptions = [{ value: '', label: 'All bands' }, ...BANDS.map((b) => ({ value: b, label: b }))];
  const modeOptions = [{ value: '', label: 'All modes' }, ...MODES.map((m) => ({ value: m, label: m }))];

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

  const columns: Column[] = $derived([
    { key: 'qso_date', header: t.qso.date, sortable: true },
    { key: 'time_on', header: t.qso.time, format: (v: unknown) => String(v ?? '').slice(0, 5) },
    { key: 'callsign', header: t.qso.callsign, sortable: true },
    { key: 'band', header: t.qso.band, sortable: true },
    { key: 'mode', header: t.qso.mode, sortable: true },
    { key: 'rst_sent', header: t.qso.rstSent },
    { key: 'rst_rcvd', header: t.qso.rstRcvd },
    { key: 'country', header: 'Country', sortable: true },
  ]);

  function buildFilter(): QSOFilter {
    const f: QSOFilter = {};
    if (filterCallsign.trim()) f.callsign = filterCallsign.trim();
    if (filterBand) f.band = filterBand;
    if (filterMode) f.mode = filterMode;
    if (filterDateFrom) f.dateFrom = filterDateFrom;
    if (filterDateTo) f.dateTo = filterDateTo;
    return f;
  }

  async function loadData() {
    loading = true;
    try {
      const result = await getQSOs(supabase, buildFilter(), { field: 'qso_date', direction: 'desc' }, currentPage, PAGE_SIZE);
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

  function handleTableClick(e: MouseEvent) {
    if (!authStore.isAdmin) return;
    const target = e.target as HTMLElement;
    const row = target.closest('tr');
    if (!row) return;
    const tbody = row.parentElement;
    if (!tbody || tbody.tagName !== 'TBODY') return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const idx = rows.indexOf(row);
    if (idx >= 0 && idx < data.length && data[idx].id) {
      goto(`/qso/${data[idx].id}`);
    }
  }
</script>

<svelte:head>
  <title>{t.qso.title}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<PageHeader title={t.qso.title}>
  {#snippet action()}
    {#if authStore.isAdmin}
      <Button variant="secondary" size="sm" onclick={() => goto('/qso')}>{t.qso.newQSO}</Button>
    {/if}
  {/snippet}
</PageHeader>

{#if !initialLoaded}
  <div class="flex justify-center py-12">
    <LoadingSpinner size="lg" />
  </div>
{:else if total === 0 && !filterCallsign && !filterBand && !filterMode && !filterDateFrom && !filterDateTo}
  <EmptyState icon={Radio} message={t.qso.noQSOsYet}>
    {#snippet cta()}
      {#if authStore.isAdmin}
        <Button variant="primary" onclick={() => goto('/qso')}>{t.qso.logYourFirst}</Button>
      {/if}
    {/snippet}
  </EmptyState>
{:else}
  <div class="flex flex-col gap-4">
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

    <div onclick={authStore.isAdmin ? handleTableClick : undefined} class={authStore.isAdmin ? 'cursor-pointer' : ''}>
      <DataTable
        {columns}
        data={data as unknown as Record<string, unknown>[]}
        {loading}
        keyExtractor={(row) => row.id as string}
        emptyMessage={t.qso.noQSOsYet}
      />
    </div>

    {#if data.length > 0}
      <div class="text-xs text-[var(--color-text-muted)] font-[var(--font-mono)]">
        {total} total
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
