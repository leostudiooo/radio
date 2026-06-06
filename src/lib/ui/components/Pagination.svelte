<script lang="ts">
	import Button from './Button.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';

	interface Props {
		currentPage: number;
		totalPages: number;
		onpage?: (page: number) => void;
	}

	let { currentPage, totalPages, onpage }: Props = $props();

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

<div class="mt-[var(--space-6)] flex items-center justify-center gap-[var(--space-2)]">
	<Button
		variant="ghost"
		size="sm"
		disabled={currentPage <= 1}
		onclick={() => goToPage(currentPage - 1)}
	>
		{localeStore.translation.common.prev}
	</Button>

	<div class="hidden items-center gap-[var(--space-1)] sm:flex">
		{#each getPageNumbers() as page}
			{#if page === '...'}
				<span class="px-[var(--space-2)] text-[var(--color-text-muted)] text-[var(--text-body)]"
					>...</span
				>
			{:else if typeof page === 'number'}
				<button
					type="button"
					onclick={() => goToPage(page)}
					aria-current={page === currentPage ? 'page' : undefined}
					style={page === currentPage ? 'color: var(--color-text-on-accent)' : ''}
					class="h-[28px] min-w-[28px] px-[0.375rem] font-mono text-[var(--text-body)] transition-colors duration-100 {page ===
					currentPage
						? 'bg-[var(--color-accent)]'
						: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'}"
				>
					{page}
				</button>
			{/if}
		{/each}
	</div>

	<span class="font-mono text-[var(--color-text-muted)] text-[var(--text-body)] sm:hidden">
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
