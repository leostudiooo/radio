<script lang="ts">
  import { SITE_CONFIG } from '$lib/config';

  interface Props {
    profile: { callsign?: string; grid_square?: string; qth?: string; name?: string } | null;
  }

  let { profile }: Props = $props();

  const callsign = profile?.callsign ?? SITE_CONFIG.callsign;
  const grid_square = profile?.grid_square;
  const qth = profile?.qth;
</script>

<div class="bg-[var(--color-surface)] border border-[var(--color-border)] p-[var(--space-6)]">
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--space-4)]">
    <div>
      <h1 class="text-[var(--text-title)] font-[var(--font-mono)] font-bold text-[var(--color-accent)]">
        {callsign}
      </h1>
      <p class="text-[var(--text-aux)] text-[var(--color-text-secondary)] mt-[var(--space-1)]">
        Amateur Radio Station
      </p>
    </div>
    <div class="flex flex-wrap gap-[var(--space-4)] text-[var(--text-aux)] text-[var(--color-text-secondary)]">
      {#if grid_square}
        <span>Grid: {grid_square}</span>
      {/if}
      {#if qth}
        <span>QTH: {qth}</span>
      {/if}
    </div>
  </div>
</div>
