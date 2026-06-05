<script lang="ts">
  import { SITE_CONFIG } from '$lib/config';
  import { localeStore } from '$lib/ui/stores/locale.svelte';

  interface Props {
    profile: { callsign?: string; grid_square?: string; qth?: string; name?: string } | null;
  }

  let { profile }: Props = $props();

  const callsign = profile?.callsign ?? SITE_CONFIG.callsign;
  const grid_square = profile?.grid_square;
  const qth = profile?.qth;
</script>

<div class="card-panel p-[var(--space-6)]">
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--space-4)]">
    <div>
      <h1 class="text-[var(--text-title)] font-[var(--font-mono)] font-bold text-[var(--color-text-primary)]">
        {callsign}
      </h1>
      <p class="text-[var(--text-aux)] text-[var(--color-text-secondary)] mt-[var(--space-1)]">
        {localeStore.translation.common.station}
      </p>
    </div>
    <div class="flex flex-wrap gap-[var(--space-4)] text-[var(--text-aux)] text-[var(--color-text-secondary)]">
      {#if grid_square}
        <span>{localeStore.translation.common.grid}: {grid_square}</span>
      {/if}
      {#if qth}
        <span>{localeStore.translation.common.qth}: {qth}</span>
      {/if}
    </div>
  </div>
</div>
