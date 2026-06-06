<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import { QSL_METHODS, QSL_STATUSES } from '$lib/logic/types/qsl';
  import { getQSLCards, updateQSLCard, getQSLStats } from '$lib/logic/data/qsl';
  import type { QSLCard, QSLMethod, QSLStatus, QSLStats } from '$lib/logic/types/qsl';
  import { formatDate } from '$lib/ui/utils/format';

  import StatCard from '$lib/ui/components/StatCard.svelte';
  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import StatusBadge from '$lib/ui/components/StatusBadge.svelte';
  import FilterBar from '$lib/ui/components/FilterBar.svelte';
  import FormSelect from '$lib/ui/components/FormSelect.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { ArrowUpDown } from '@lucide/svelte';
  import { SITE_CONFIG } from '$lib/config';

  const t = $derived(localeStore.translation);

  const STATUS_CYCLE: QSLStatus[] = ['pending', 'sent', 'received', 'confirmed'];

  const statusLabel: Record<QSLStatus, string> = $derived({
    pending: t.qsl.pending,
    sent: t.qsl.sent,
    received: t.qsl.received,
    confirmed: t.qsl.confirmed,
    invalid: t.qsl.invalid,
  });

  const methodLabel: Record<QSLMethod, string> = $derived({
    paper: t.qsl.paper,
    lotw: t.qsl.lotw,
    eqsl: t.qsl.eqsl,
  });

  const methodOptions = $derived([
    { value: '', label: t.qsl.allMethods },
    ...QSL_METHODS.map((m) => ({ value: m, label: methodLabel[m] })),
  ]);

  const statusOptions = $derived([
    { value: '', label: t.qsl.allStatuses },
    ...QSL_STATUSES.map((s) => ({ value: s, label: statusLabel[s] })),
  ]);

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

  function truncate(s: string | undefined, len = 30): string {
    if (!s) return '-';
    return s.length > len ? s.slice(0, len) + '...' : s;
  }

</script>

<svelte:head>
  <title>{t.qsl.management}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<PageHeader title={t.qsl.management} />

{#if !initialLoaded}
  <div class="flex justify-center py-[var(--space-12)]">
    <LoadingSpinner size="lg" />
  </div>
{:else}
  <div class="flex flex-col gap-[var(--space-6)]">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-[var(--space-3)]">
      <StatCard label={t.qsl.totalCards} value={stats?.total ?? 0} />
      <StatCard label={t.qsl.paper} value={stats?.byMethod.paper ?? 0} />
      <StatCard label={t.qsl.lotw} value={stats?.byMethod.lotw ?? 0} />
      <StatCard label={t.qsl.eqsl} value={stats?.byMethod.eqsl ?? 0} />
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
              <th class="px-[var(--space-3)] py-[0.625rem] text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.qsoId}</th>
              <th class="px-[var(--space-3)] py-[0.625rem] text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.method}</th>
              <th class="px-[var(--space-3)] py-[0.625rem] text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.sentStatus}</th>
              <th class="px-[var(--space-3)] py-[0.625rem] text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.receivedStatus}</th>
              <th class="px-[var(--space-3)] py-[0.625rem] text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.sentDate}</th>
              <th class="px-[var(--space-3)] py-[0.625rem] text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.receivedDate}</th>
              <th class="px-[var(--space-3)] py-[0.625rem] text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] text-left">{t.qsl.notes}</th>
            </tr>
          </thead>
          <tbody>
            {#each data as card (card.id)}
              <tr class="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors duration-100" class:opacity-50={updatingId === card.id}>
                <td class="px-[var(--space-3)] py-[var(--space-3)] text-[var(--text-body)] font-mono text-[var(--color-text-primary)]">{card.qso_id.slice(0, 8)}</td>
                <td class="px-[var(--space-3)] py-[var(--space-3)] text-[var(--text-body)] font-mono text-[var(--color-text-primary)]">
                  <span class="inline-block px-[var(--space-2)] py-[var(--space-0-5)] text-[var(--text-body)] font-medium uppercase tracking-[0.05em] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    {methodLabel[card.method]}
                  </span>
                </td>
                <td class="px-[var(--space-3)] py-[var(--space-3)]">
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
                <td class="px-[var(--space-3)] py-[var(--space-3)]">
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
                <td class="px-[var(--space-3)] py-[var(--space-3)] text-[var(--text-body)] font-mono text-[var(--color-text-primary)]">{formatDate(card.sent_date)}</td>
                <td class="px-[var(--space-3)] py-[var(--space-3)] text-[var(--text-body)] font-mono text-[var(--color-text-primary)]">{formatDate(card.received_date)}</td>
                <td class="px-[var(--space-3)] py-[var(--space-3)] text-[var(--text-body)] font-mono text-[var(--color-text-secondary)] max-w-[200px] truncate">{truncate(card.notes)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="lg:hidden flex flex-col gap-[var(--space-3)]">
        {#each data as card (card.id)}
          <div class="card-panel p-[var(--space-4)] flex flex-col gap-[var(--space-2)]" class:opacity-50={updatingId === card.id}>
            <div class="flex justify-between gap-[var(--space-2)]">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.qsoId}</span>
              <span class="text-[var(--text-body)] font-mono text-[var(--color-text-primary)]">{card.qso_id.slice(0, 8)}</span>
            </div>
            <div class="flex justify-between gap-[var(--space-2)]">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.method}</span>
              <span class="text-[var(--text-body)] font-mono text-[var(--color-text-primary)]">{methodLabel[card.method]}</span>
            </div>
            <div class="flex justify-between items-center gap-[var(--space-2)]">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.sentStatus}</span>
              {#if authStore.isAdmin}
                <button type="button" onclick={() => cycleSentStatus(card)} class="cursor-pointer" title={t.qsl.cycleSentStatus}>
                  <StatusBadge status={card.sent_status ?? 'pending'} />
                </button>
              {:else}
                <StatusBadge status={card.sent_status ?? 'pending'} />
              {/if}
            </div>
            <div class="flex justify-between items-center gap-[var(--space-2)]">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.receivedStatus}</span>
              {#if authStore.isAdmin}
                <button type="button" onclick={() => cycleReceivedStatus(card)} class="cursor-pointer" title={t.qsl.cycleReceivedStatus}>
                  <StatusBadge status={card.received_status ?? 'pending'} />
                </button>
              {:else}
                <StatusBadge status={card.received_status ?? 'pending'} />
              {/if}
            </div>
            <div class="flex justify-between gap-[var(--space-2)]">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.sentDate}</span>
              <span class="text-[var(--text-body)] font-mono text-[var(--color-text-primary)]">{formatDate(card.sent_date)}</span>
            </div>
            <div class="flex justify-between gap-[var(--space-2)]">
              <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.receivedDate}</span>
              <span class="text-[var(--text-body)] font-mono text-[var(--color-text-primary)]">{formatDate(card.received_date)}</span>
            </div>
            {#if card.notes}
              <div class="flex justify-between gap-[var(--space-2)]">
                <span class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{t.qsl.notes}</span>
                <span class="text-[var(--text-body)] font-mono text-[var(--color-text-secondary)] text-right max-w-[200px] truncate">{truncate(card.notes)}</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <div class="text-[var(--text-aux)] text-[var(--color-text-muted)] font-mono">
        {t.qso.totalCount.replace('{total}', String(data.length))}
      </div>
    {/if}
  </div>
{/if}
