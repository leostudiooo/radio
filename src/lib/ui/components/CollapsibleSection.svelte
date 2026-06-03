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

<div class="border border-[var(--color-border)] bg-[var(--color-surface)]">
  <button
    type="button"
    onclick={toggle}
    class="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[var(--color-elevated)] transition-colors duration-100"
  >
    <span class="font-mono text-sm text-[var(--color-accent)]">{open ? '[-]' : '[+]'}</span>
    <span class="text-sm font-medium text-[var(--color-text-primary)]">{title}</span>
  </button>
  {#if open}
    <div class="px-4 pb-4 pt-1 border-t border-[var(--color-border)]">
      {@render children()}
    </div>
  {/if}
</div>
