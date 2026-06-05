<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    open?: boolean;
    children: Snippet;
  }

  let {
    title,
    open = $bindable(false),
    children,
  }: Props = $props();

  function toggle() {
    open = !open;
  }
</script>

<div class="card-panel">
  <button
    type="button"
    onclick={toggle}
    class="w-full flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-3)] text-left hover:bg-[var(--color-elevated)] transition-colors duration-100"
  >
    <span class="font-mono text-[var(--text-body)] text-[var(--color-accent)]">{open ? '[-]' : '[+]'}</span>
    <span class="text-[var(--text-body)] font-medium text-[var(--color-text-primary)]">{title}</span>
  </button>
  {#if open}
    <div class="px-[var(--space-4)] pb-[var(--space-4)] pt-[var(--space-1)] border-t border-[var(--color-border)]">
      {@render children()}
    </div>
  {/if}
</div>
