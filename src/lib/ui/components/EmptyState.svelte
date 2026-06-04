<script lang="ts">
  import type { ComponentType } from 'svelte';
  import type { Icon } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    icon?: ComponentType<Icon>;
    message: string;
    cta?: Snippet;
  }

  let { icon: IconComponent, message, cta }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center gap-[var(--space-4)] py-[var(--space-16)] text-center">
  {#if IconComponent}
    <IconComponent size={48} class="text-[var(--color-text-muted)]" />
  {/if}
  <p class="text-[var(--text-body)] text-[var(--color-text-secondary)]">{message}</p>
  {#if cta}
    <div>{@render cta()}</div>
  {/if}
</div>
