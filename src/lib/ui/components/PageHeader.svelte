<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    subtitle?: string;
    action?: Snippet;
  }

  let { title, subtitle, action }: Props = $props();
</script>

<div class="flex flex-col gap-1 mb-6">
  <div class="flex items-center justify-between gap-4">
    <h1 class="text-2xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
    {#if action}
      {@render action()}
    {/if}
  </div>
  {#if subtitle}
    <p class="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
  {/if}
</div>
