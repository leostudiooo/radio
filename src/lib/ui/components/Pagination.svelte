<script lang="ts">
  import Button from './Button.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';

  interface Props {
    currentPage: number;
    totalPages: number;
    onpage?: (page: number) => void;
  }

  let {
    currentPage,
    totalPages,
    onpage,
  }: Props = $props();

  function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onpage?.(page);
  }

  function getPageNumbers(): (number | string)[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    pages.push(totalPages);
    return pages;
  }
</script>

<div class="flex items-center justify-center gap-[var(--space-2)] mt-[var(--space-6)]">
  <Button
    variant="ghost"
    size="sm"
    disabled={currentPage <= 1}
    onclick={() => goToPage(currentPage - 1)}
  >
    {localeStore.translation.common.prev}
  </Button>

  <div class="hidden sm:flex items-center gap-[var(--space-1)]">
    {#each getPageNumbers() as page}
      {#if page === '...'}
        <span class="px-[var(--space-2)] text-[var(--text-body)] text-[var(--color-text-muted)]">...</span>
      {:else if typeof page === 'number'}
        <button
          type="button"
          onclick={() => goToPage(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          style={page === currentPage ? 'color: var(--color-text-on-accent)' : ''}
          class="min-w-[28px] h-[28px] px-[0.375rem] text-[var(--text-body)] font-mono transition-colors duration-100 {page === currentPage ? 'bg-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'}"
        >
          {page}
        </button>
      {/if}
    {/each}
  </div>

  <span class="sm:hidden text-[var(--text-body)] text-[var(--color-text-muted)] font-mono">
    {currentPage} / {totalPages}
  </span>

  <Button
    variant="ghost"
    size="sm"
    disabled={currentPage >= totalPages}
    onclick={() => goToPage(currentPage + 1)}
  >
    {localeStore.translation.common.next}
  </Button>
</div>
