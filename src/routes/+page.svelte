<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { settingsStore } from '$lib/ui/stores/settings.svelte';
  import { getQSOs } from '$lib/logic/data/qso';
  import type { QSO } from '$lib/logic/types/qso';
  import type { Column } from '$lib/ui/components/DataTable';
  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import DataTable from '$lib/ui/components/DataTable.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { Radio } from 'lucide-svelte';
  import { SITE_CONFIG } from '$lib/config';

  const t = $derived(localeStore.translation);

  let data = $state<QSO[]>([]);
  let loading = $state(true);
  let initialLoaded = $state(false);

  const columns: Column[] = $derived([
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
    { key: 'callsign', header: t.qso.callsign },
    { key: 'band', header: t.qso.band },
    { key: 'mode', header: t.qso.mode },
    { key: 'rst_sent', header: t.qso.rstSent },
    { key: 'rst_rcvd', header: t.qso.rstRcvd },
  ]);

  async function loadRecentQSOs() {
    loading = true;
    try {
      const result = await getQSOs(supabase, {}, { field: 'time_on', direction: 'desc' }, 1, 10);
      data = result.data;
    } catch {
      data = [];
    } finally {
      loading = false;
      initialLoaded = true;
    }
  }

  onMount(() => {
    loadRecentQSOs();
  });
</script>

<svelte:head>
  <title>{SITE_CONFIG.siteTitle}</title>
</svelte:head>

<PageHeader
  title={t.qso.recentQSOs}
  subtitle={authStore.isAuthenticated
    ? t.qso.loggedInAs.replace('{callsign}', authStore.callsign ?? authStore.user?.email ?? 'unknown')
    : t.qso.publicView}
>
  {#snippet action()}
    <Button variant="secondary" size="sm" onclick={() => goto('/qso')}>
      {t.qso.viewAll}
    </Button>
  {/snippet}
</PageHeader>

{#if authStore.isAuthenticated}
  <div class="mb-6 text-[var(--text-body)] text-[var(--color-text-secondary)]">
    <p>{t.qso.welcome}</p>
  </div>
{/if}

{#if !initialLoaded}
  <div class="flex justify-center py-12">
    <LoadingSpinner size="lg" />
  </div>
{:else if data.length === 0}
  <EmptyState
    icon={Radio}
    message={t.qso.noQSOsYet}
  />
{:else}
  <div class="flex flex-col gap-4">
    <DataTable
      {columns}
      data={data as unknown as Record<string, unknown>[]}
      {loading}
      keyExtractor={(row) => row.id as string}
      emptyMessage={t.qso.noQSOsYet}
    />
  </div>
{/if}
