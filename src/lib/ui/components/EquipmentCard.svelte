<script lang="ts">
  import type { Equipment } from '$lib/logic/types/equipment';
  import { localeStore } from '$lib/ui/stores/locale.svelte';

  interface Props {
    equipment: Equipment;
  }

  let { equipment }: Props = $props();
</script>

<div class="card-panel p-[var(--space-3)]">
  <div class="flex items-center justify-between">
    <div>
      <span class="text-[var(--text-body)] font-medium text-[var(--color-text-primary)]">{equipment.name}</span>
      <span class="text-[var(--text-aux)] text-[var(--color-text-secondary)] ml-[var(--space-2)]">{equipment.type}</span>
    </div>
    {#if equipment.is_active}
      <span class="text-[var(--text-body)] text-[var(--color-success)]">{localeStore.translation.equipment.active}</span>
    {/if}
  </div>
</div>
