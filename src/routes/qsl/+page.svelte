<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import { QSL_METHODS, QSL_STATUSES } from '$lib/logic/types/qsl';
  import { getQSLCards, updateQSLCard, getQSLStats } from '$lib/logic/data/qsl';
  import type { QSLCard, QSLMethod, QSLStatus, QSLStats } from '$lib/logic/types/qsl';

  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import StatusBadge from '$lib/ui/components/StatusBadge.svelte';
  import FilterBar from '$lib/ui/components/FilterBar.svelte';
  import FormSelect from '$lib/ui/components/FormSelect.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { ArrowUpDown } from 'lucide-svelte';
  import { SITE_CONFIG } from '$lib/config';

  const t = $derived(localeStore.translation);

  const STATUS_CYCLE: QSLStatus[] = ['pending', 'sent', 'received', 'confirmed'];

  const methodLabel: Record<QSLMethod, string> = {
    paper: 'Paper',
    lotw: 'LoTW',
    eqsl: 'eQSL',
  };

  const methodOptions = [
    { value: '', label: 'All methods' },
    ...QSL_METHODS.map((m) => ({ value: m, label: methodLabel[m] })),
  ];

  const statusOptions = [
    { value: '', label: 'All statuses' },
    ...QSL_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
  ];

  let filterMethod = $state('');
  let filterStatus = $state('');
  let data = $state<QSLCard[]>([]);
  let stats = $state<QSLStats | null>(null);
  let loading = $state(true);
  let initialLoaded = $state(false);
  let updatingId = $state<string | null>(null);

  async function loadData() {
    loading = true;
    try {
      const filter: { method?: QSLMethod; status?: QSLStatus } = {};
      if (filterMethod) filter.method = filterMethod as QSLMethod;
      if (filterStatus) filter.status = filterStatus as QSLStatus;
      const [cards, s] = await Promise.all([
        getQSLCards(supabase, filter),
        getQSLStats(supabase),
      ]);
      data = cards;
      stats = s;
    } catch {
      data = [];
      stats = null;
    } finally {
      loading = false;
      initialLoaded = true;
    }
  }

  $effect(() => {
    loadData();
  });

  function applyFilters() {
    loadData();
  }

  function clearFilters() {
    filterMethod = '';
    filterStatus = '';
    loadData();
  }

  function nextStatus(current: QSLStatus | undefined): QSLStatus {
    const safe = current ?? 'pending';
    const idx = STATUS_CYCLE.indexOf(safe);
    if (idx === -1 || idx === STATUS_CYCLE.length - 1) return STATUS_CYCLE[0];
    return STATUS_CYCLE[idx + 1];
  }

  async function cycleSentStatus(card: QSLCard) {
    const next = nextStatus(card.sent_status);
    updatingId = card.id;
    try {
      await updateQSLCard(supabase, card.id, { sent_status: next });
      toastStore.success(t.qsl.statusUpdated);
      await loadData();
    } catch {
      toastStore.error(t.qsl.updateFailed);
    } finally {
      updatingId = null;
    }
  }

  async function cycleReceivedStatus(card: QSLCard) {
    const next = nextStatus(card.received_status);
    updatingId = card.id;
    try {
      await updateQSLCard(supabase, card.id, { received_status: next });
      toastStore.success(t.qsl.statusUpdated);
      await loadData();
    } catch {
      toastStore.error(t.qsl.updateFailed);
    } finally {
      updatingId = null;
    }
  }

  function formatDate(v: string | undefined): string {
    if (!v) return '-';
    return v.slice(0, 10);
  }

  function truncate(s: string | undefined, len = 30): string {
    if (!s) return '-';
    return s.length > len ? s.slice(0, len) + '...' : s;
  }

  const statCards = $derived([
    { label: t.qsl.totalCards, value: stats?.total ?? 0, accent: false },
    { label: 'Paper', value: stats?.byMethod.paper ?? 0, accent: false },
    { label: 'LoTW', value: stats?.byMethod.lotw ?? 0, accent: false },
    { label: 'eQSL', value: stats?.byMethod.eqsl ?? 0, accent: false },
  ]);
</script>

<svelte:head>
  <title>{t.qsl.management}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<PageHeader title={t.qsl.management} />

{#if !initialLoaded}
  <div class="flex justify-center py-12">
    <LoadingSpinner size="lg" />
  </div>
{:else}
  <div class="flex flex-col gap-6">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {#each statCards as card}
        <div class="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 flex flex-col gap-1">
          <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{card.label}</span>
          <span class="text-[var(--text-title)] font-semibold text-[var(--color-text-primary)]">{card.value}</span>
        </div>
      {/each}
    </div>

    <FilterBar onclear={clearFilters}>
      <FormSelect
        label={t.qsl.method}
        value={filterMethod}
        options={methodOptions}
        onchange={(v) => { filterMethod = v; applyFilters(); }}
      />
      <FormSelect
        label={t.qsl.status}
        value={filterStatus}
        options={statusOptions}
        onchange={(v) => { filterStatus = v; applyFilters(); }}
      />
    </FilterBar>

    {#if data.length === 0}
      <EmptyState icon="✉️" message={t.qsl.noQSLCards} />
    {:else}
      <div class="hidden lg:block overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <th class="px-3 py-2.5 text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.qsoId}</th>
              <th class="px-3 py-2.5 text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.method}</th>
              <th class="px-3 py-2.5 text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.sentStatus}</th>
              <th class="px-3 py-2.5 text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.receivedStatus}</th>
              <th class="px-3 py-2.5 text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.sentDate}</th>
              <th class="px-3 py-2.5 text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.receivedDate}</th>
              <th class="px-3 py-2.5 text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.notes}</th>
            </tr>
          </thead>
          <tbody>
            {#each data as card (card.id)}
              <tr class="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors duration-100" class:opacity-50={updatingId === card.id}>
                <td class="px-3 py-3 text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-primary)]">{card.qso_id.slice(0, 8)}</td>
                <td class="px-3 py-3 text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-primary)]">
                  <span class="inline-block px-2 py-0.5 text-[var(--text-body)] font-medium uppercase tracking-[0.05em] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    {methodLabel[card.method]}
                  </span>
                </td>
                <td class="px-3 py-3">
                  {#if authStore.isAdmin}
                    <button
                      type="button"
                      onclick={() => cycleSentStatus(card)}
                      class="cursor-pointer"
                      title={t.qsl.cycleSentStatus}
                    >
                      <StatusBadge status={card.sent_status ?? 'pending'} />
                    </button>
                  {:else}
                    <StatusBadge status={card.sent_status ?? 'pending'} />
                  {/if}
                </td>
                <td class="px-3 py-3">
                  {#if authStore.isAdmin}
                    <button
                      type="button"
                      onclick={() => cycleReceivedStatus(card)}
                      class="cursor-pointer"
                      title={t.qsl.cycleReceivedStatus}
                    >
                      <StatusBadge status={card.received_status ?? 'pending'} />
                    </button>
                  {:else}
                    <StatusBadge status={card.received_status ?? 'pending'} />
                  {/if}
                </td>
                <td class="px-3 py-3 text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-primary)]">{formatDate(card.sent_date)}</td>
                <td class="px-3 py-3 text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-primary)]">{formatDate(card.received_date)}</td>
                <td class="px-3 py-3 text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-secondary)] max-w-[200px] truncate">{truncate(card.notes)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="lg:hidden flex flex-col gap-3">
        {#each data as card (card.id)}
          <div class="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 flex flex-col gap-2" class:opacity-50={updatingId === card.id}>
            <div class="flex justify-between gap-2">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.qsoId}</span>
              <span class="text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-primary)]">{card.qso_id.slice(0, 8)}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.method}</span>
              <span class="text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-primary)]">{methodLabel[card.method]}</span>
            </div>
            <div class="flex justify-between items-center gap-2">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.sentStatus}</span>
              {#if authStore.isAdmin}
                <button type="button" onclick={() => cycleSentStatus(card)} class="cursor-pointer" title={t.qsl.cycleSentStatus}>
                  <StatusBadge status={card.sent_status ?? 'pending'} />
                </button>
              {:else}
                <StatusBadge status={card.sent_status ?? 'pending'} />
              {/if}
            </div>
            <div class="flex justify-between items-center gap-2">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.receivedStatus}</span>
              {#if authStore.isAdmin}
                <button type="button" onclick={() => cycleReceivedStatus(card)} class="cursor-pointer" title={t.qsl.cycleReceivedStatus}>
                  <StatusBadge status={card.received_status ?? 'pending'} />
                </button>
              {:else}
                <StatusBadge status={card.received_status ?? 'pending'} />
              {/if}
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.sentDate}</span>
              <span class="text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-primary)]">{formatDate(card.sent_date)}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.receivedDate}</span>
              <span class="text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-primary)]">{formatDate(card.received_date)}</span>
            </div>
            {#if card.notes}
              <div class="flex justify-between gap-2">
                <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.notes}</span>
                <span class="text-[var(--text-body)] font-[var(--font-mono)] text-[var(--color-text-secondary)] text-right max-w-[200px] truncate">{truncate(card.notes)}</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <div class="text-[var(--text-aux)] text-[var(--color-text-muted)] font-[var(--font-mono)]">
        {data.length} total
      </div>
    {/if}
  </div>
{/if}
