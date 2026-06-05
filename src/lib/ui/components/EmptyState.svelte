<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    message: string;
    icon?: string;
    cta?: Snippet;
  }

  let { message, icon = '\u{1F4ED}', cta }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center gap-[var(--space-4)] py-[var(--space-16)] text-center text-[var(--color-text-secondary)]">
  <span class="text-4xl">{icon}</span>
  <p class="text-[var(--text-subtitle)]">{message}</p>
  {#if cta}
    <div>{@render cta()}</div>
  {/if}
</div>
