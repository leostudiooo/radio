<script lang="ts">
  import type { Equipment } from '$lib/logic/types/equipment';

  interface Props {
    equipment: Equipment;
  }

  let { equipment }: Props = $props();
</script>

<div class="bg-[var(--color-surface)] border border-[var(--color-border)] p-[var(--space-3)]">
  <div class="flex items-center justify-between">
    <div>
      <span class="text-[var(--text-body)] font-medium text-[var(--color-text-primary)]">{equipment.name}</span>
      <span class="text-[var(--text-aux)] text-[var(--color-text-secondary)] ml-[var(--space-2)]">{equipment.type}</span>
    </div>
    {#if equipment.is_active}
      <span class="text-[var(--text-caption)] text-[var(--color-success)]">Active</span>
    {/if}
  </div>
</div>
