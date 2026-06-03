<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { getEquipment } from '$lib/logic/data/equipment';
  import type { Equipment } from '$lib/logic/types/equipment';
  import type { Column } from '$lib/ui/components/DataTable';

  import PageHeader from '$lib/ui/components/PageHeader.svelte';
  import DataTable from '$lib/ui/components/DataTable.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
  import { Cpu } from 'lucide-svelte';
  import { SITE_CONFIG } from '$lib/config';

  const t = $derived(localeStore.translation);

  let data = $state<Equipment[]>([]);
  let loading = $state(true);
  let initialLoaded = $state(false);

  const columns: Column[] = $derived([
    { key: 'name', header: t.equipment.name, sortable: true },
    { key: 'type', header: t.equipment.type, sortable: true },
    { key: 'manufacturer', header: t.equipment.manufacturer },
    { key: 'model', header: t.equipment.model },
    {
      key: 'is_active',
      header: t.equipment.active,
      format: (v: unknown) => (v ? '●' : '○'),
    },
  ]);

  async function loadData() {
    loading = true;
    try {
      data = await getEquipment(supabase);
    } catch {
      data = [];
    } finally {
      loading = false;
      initialLoaded = true;
    }
  }

  $effect(() => {
    loadData();
  });

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
      goto(`/equipment/${data[idx].id}`);
    }
  }
</script>

<svelte:head>
  <title>{t.equipment.title}{SITE_CONFIG.pageTitleSuffix}</title>
</svelte:head>

<PageHeader title={t.equipment.title}>
  {#snippet action()}
    {#if authStore.isAdmin}
      <Button variant="secondary" size="sm" onclick={() => goto('/equipment/new')}>{t.equipment.newEquipment}</Button>
    {/if}
  {/snippet}
</PageHeader>

{#if !initialLoaded}
  <div class="flex justify-center py-12">
    <LoadingSpinner size="lg" />
  </div>
{:else if data.length === 0}
  <EmptyState icon={Cpu} message={t.equipment.noEquipment}>
    {#snippet cta()}
      {#if authStore.isAdmin}
        <Button variant="primary" onclick={() => goto('/equipment/new')}>{t.equipment.addFirst}</Button>
      {/if}
    {/snippet}
  </EmptyState>
{:else}
  <div onclick={handleTableClick} class={authStore.isAdmin ? 'cursor-pointer' : ''}>
    <DataTable
      {columns}
      data={data as unknown as Record<string, unknown>[]}
      {loading}
      keyExtractor={(row) => row.id as string}
      emptyMessage={t.equipment.noEquipment}
    />
  </div>
{/if}
