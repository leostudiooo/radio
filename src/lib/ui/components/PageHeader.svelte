<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    subtitle?: string;
    action?: Snippet;
  }

  let { title, subtitle, action }: Props = $props();
</script>

<div class="flex flex-col gap-[var(--space-1)] mb-[var(--space-6)]">
  <div class="flex items-center justify-between gap-[var(--space-4)]">
    <h1 class="text-[var(--text-title)] font-semibold text-[var(--color-text-primary)]">{title}</h1>
    {#if action}
      {@render action()}
    {/if}
  </div>
  {#if subtitle}
    <p class="text-[var(--text-body)] text-[var(--color-text-secondary)]">{subtitle}</p>
  {/if}
</div>
