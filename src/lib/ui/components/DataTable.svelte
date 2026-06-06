<script lang="ts">
	import LoadingSpinner from './LoadingSpinner.svelte';
	import EmptyState from './EmptyState.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { ArrowUpDown, ArrowUp, ArrowDown } from '@lucide/svelte';
	import type { Column } from './DataTable';
	import type { Snippet } from 'svelte';

	const t = $derived(localeStore.translation);

	interface Props {
		columns: Column[];
		data: Record<string, unknown>[];
		loading?: boolean;
		keyExtractor: (row: Record<string, unknown>) => string;
		emptyMessage?: string;
		actions?: Snippet<[row: Record<string, unknown>]>;
		onsort?: (key: string, dir: 'asc' | 'desc') => void;
		sort?: { key: string; dir: 'asc' | 'desc' };
		[key: `cell_${string}`]: Snippet<[row: Record<string, unknown>]> | undefined;
	}

	let {
		columns,
		data,
		loading = false,
		keyExtractor,
		emptyMessage,
		actions,
		onsort,
		sort,
		// Collect any cell-* snippet children
		...rest
	}: Props = $props();

	const cellSnippets: Record<string, Snippet<[Record<string, unknown>]>> = $derived(
		Object.fromEntries(
			Object.entries(rest)
				.filter(([k, v]) => k.startsWith('cell_') && typeof v === 'function')
				.map(([k, v]) => [k.slice(5), v as Snippet<[Record<string, unknown>]>])
		)
	);

	const resolvedEmptyMessage = $derived(emptyMessage ?? localeStore.translation.common.noData);

	let sortKey = $state<string | null>(null);
	let sortDir = $state<'asc' | 'desc'>('asc');

	const effectiveSortKey = $derived(sort?.key ?? sortKey);
	const effectiveSortDir = $derived(sort?.dir ?? sortDir);

	function handleSort(column: Column) {
		if (!column.sortable) return;
		const key = column.key;
		const newDir = effectiveSortKey === key && effectiveSortDir === 'asc' ? 'desc' : 'asc';
		sortKey = key;
		sortDir = newDir;
		onsort?.(key, newDir);
	}

	function getCellValue(row: Record<string, unknown>, column: Column): string {
		const raw = row[column.key];
		if (column.format) {
			return column.format(raw, row);
		}
		return raw === null || raw === undefined ? '' : String(raw);
	}

	const alignClasses = {
		left: 'text-left',
		right: 'text-right',
		center: 'text-center'
	};
</script>

{#if loading}
	<div class="flex flex-col gap-[var(--space-2)]">
		{#each Array(5) as _, i}
			<div
				class="h-10 animate-pulse bg-[var(--color-surface)]"
				style="animation-delay: {i * 100}ms"
			></div>
		{/each}
	</div>
{:else if data.length === 0}
	<EmptyState message={resolvedEmptyMessage} />
{:else}
	<div class="hidden overflow-x-auto lg:block">
		<table class="w-full border-collapse">
			<thead>
				<tr class="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
					{#each columns as column}
						<th
							class="px-[var(--space-3)] py-[var(--space-2)] font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase {alignClasses[
								column.align ?? 'left'
							]}"
							aria-sort={column.sortable && effectiveSortKey === column.key
								? effectiveSortDir === 'asc'
									? 'ascending'
									: 'descending'
								: undefined}
						>
							{#if column.sortable}
								<button
									class="inline-flex cursor-pointer items-center gap-[var(--space-1)] hover:text-[var(--color-text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
									onclick={() => handleSort(column)}
									aria-label={t.common.sortBy.replace('{column}', column.header)}
								>
									{column.header}
									{#if effectiveSortKey === column.key}
										{#if effectiveSortDir === 'asc'}
											<ArrowUp size={12} />
										{:else}
											<ArrowDown size={12} />
										{/if}
									{:else}
										<ArrowUpDown size={12} class="opacity-50" />
									{/if}
								</button>
							{:else}
								<span class="inline-flex items-center gap-[var(--space-1)]">
									{column.header}
								</span>
							{/if}
						</th>
					{/each}
					{#if actions}
						<th
							class="px-[var(--space-3)] py-[var(--space-2)] text-right font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
							aria-label={localeStore.translation.common.actions}
						>
							{localeStore.translation.common.actions}
						</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each data as row (keyExtractor(row))}
					<tr
						class="border-b border-[var(--color-border)] transition-colors duration-100 hover:bg-[var(--color-surface)]"
					>
						{#each columns as column}
							<td
								class="px-[var(--space-3)] py-[var(--space-3)] font-mono text-[var(--color-text-primary)] text-[var(--text-aux)] {alignClasses[
									column.align ?? 'left'
								]}"
							>
								{#if cellSnippets[column.key]}
									{@render cellSnippets[column.key](row)}
								{:else if column.badge}
									<span
										class="inline-block bg-[var(--color-accent)] px-[var(--space-2)] py-[1px]"
										style="color: var(--color-text-on-accent)">{getCellValue(row, column)}</span
									>
								{:else if column.html}
									{@html getCellValue(row, column)}
								{:else}
									{getCellValue(row, column)}
								{/if}
							</td>
						{/each}
						{#if actions}
							<td class="px-[var(--space-3)] py-[var(--space-3)] text-right">
								{@render actions(row)}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="flex flex-col gap-[var(--space-3)] lg:hidden">
		{#each data as row (keyExtractor(row))}
			<div class="card-panel flex flex-col gap-[var(--space-2)] p-[var(--space-4)]">
				{#each columns as column}
					<div class="flex justify-between gap-[var(--space-2)]">
						<span
							class="font-medium tracking-[0.05em] text-[var(--color-text-muted)] text-[var(--text-body)] uppercase"
							>{column.header}</span
						>
						<span
							class="text-right font-mono text-[var(--color-text-primary)] text-[var(--text-aux)]"
						>
							{#if cellSnippets[column.key]}
								{@render cellSnippets[column.key](row)}
							{:else if column.badge}
								<span
									class="inline-block bg-[var(--color-accent)] px-[var(--space-2)] py-[1px]"
									style="color: var(--color-text-on-accent)">{getCellValue(row, column)}</span
								>
							{:else if column.html}
								{@html getCellValue(row, column)}
							{:else}
								{getCellValue(row, column)}
							{/if}
						</span>
					</div>
				{/each}
				{#if actions}
					<div
						class="flex justify-end gap-[var(--space-2)] border-t border-[var(--color-border)] pt-[var(--space-2)]"
					>
						{@render actions(row)}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
