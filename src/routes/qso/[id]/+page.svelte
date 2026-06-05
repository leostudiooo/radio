<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { getQSOById } from '$lib/logic/data/qso';
  import type { QSO } from '$lib/logic/types/qso';
  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import QSODetail from '$lib/ui/components/QSODetail.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';

  const id: string = $derived($page.params.id);
  const t = $derived(localeStore.translation);

  let qso: QSO | null = $state(null);
  let loading = $state(true);
  let notFound = $state(false);

  async function loadQSO() {
    loading = true;
    notFound = false;
    try {
      const result = await getQSOById(supabase, id);
      if (result) {
        qso = result;
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

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  }

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  let subtitle: string = $derived.by(() => {
    if (!qso) return '';
    const parts: string[] = [];
    const d = formatDate(qso.time_on);
    const t = formatTime(qso.time_on);
    if (d || t) parts.push([d, t].filter(Boolean).join(' '));
    if (qso.band) parts.push(qso.band);
    if (qso.mode) parts.push(qso.mode);
    return parts.join(' \u00B7 ');
  });
</script>

{#if loading}
  <div class="flex justify-center py-12">
    <LoadingSpinner size="lg" />
  </div>
{:else if notFound}
  <EmptyState message={t.qso.notFound} />
{:else if qso}
  <PageHeader title={qso.callsign} {subtitle}>
    {#snippet action()}
      {#if authStore.isAdmin}
        <a
          href="/qso/{id}/edit"
          class="inline-flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-label)] font-medium bg-[var(--color-accent)] text-[var(--color-text-on-accent)] hover:opacity-90 transition-opacity"
        >
          {t.common.edit}
        </a>
      {/if}
    {/snippet}
  </PageHeader>
  <QSODetail {qso} isAdmin={authStore.isAdmin} />
{/if}
