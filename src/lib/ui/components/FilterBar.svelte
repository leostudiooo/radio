<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    onclear?: () => void;
  }

  let { children, onclear }: Props = $props();
</script>

<div class="flex items-center gap-[var(--space-2)] overflow-x-auto pb-[var(--space-2)]">
  {@render children()}
  {#if onclear}
    <button
      type="button"
      onclick={onclear}
      class="shrink-0 text-[var(--text-caption)] text-[var(--color-text-muted)] hover:text-[var(--color-status-invalid)] transition-colors duration-100 whitespace-nowrap"
    >
      Clear
    </button>
  {/if}
</div>
