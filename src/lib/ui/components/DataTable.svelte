<script lang="ts">
  import LoadingSpinner from './LoadingSpinner.svelte';
  import EmptyState from './EmptyState.svelte';
  import { ArrowUpDown } from 'lucide-svelte';
  import type { Column } from './DataTable';

  interface Props {
    columns: Column[];
    data: Record<string, unknown>[];
    loading?: boolean;
    keyExtractor: (row: Record<string, unknown>) => string;
    emptyMessage?: string;
  }

  let {
    columns,
    data,
    loading = false,
    keyExtractor,
    emptyMessage = 'No data found',
  }: Props = $props();

  let sortKey = $state<string | null>(null);
  let sortDir = $state<'asc' | 'desc'>('asc');

  function handleSort(column: Column) {
    if (!column.sortable) return;
    if (sortKey === column.key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = column.key;
      sortDir = 'asc';
    }
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
    center: 'text-center',
  };
</script>

{#if loading}
  <div class="flex flex-col gap-2">
    {#each Array(5) as _, i}
      <div class="h-10 bg-[var(--color-surface)] animate-pulse" style="animation-delay: {i * 100}ms"></div>
    {/each}
  </div>
{:else if data.length === 0}
  <EmptyState message={emptyMessage} />
{:else}
  <div class="hidden lg:block overflow-x-auto">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          {#each columns as column}
            <th
              class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)] {alignClasses[column.align ?? 'left']}"
              class:cursor-pointer={column.sortable}
              class:hover:text-[var(--color-text-secondary)]={column.sortable}
              onclick={() => handleSort(column)}
            >
              <span class="inline-flex items-center gap-1">
                {column.header}
                {#if column.sortable}
                  <ArrowUpDown size={12} class="opacity-50" />
                {/if}
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each data as row (keyExtractor(row))}
          <tr class="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors duration-100">
            {#each columns as column}
              <td class="px-3 py-3 text-[13px] font-[var(--font-mono)] text-[var(--color-text-primary)] {alignClasses[column.align ?? 'left']}">
                {getCellValue(row, column)}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="lg:hidden flex flex-col gap-3">
    {#each data as row (keyExtractor(row))}
      <div class="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 flex flex-col gap-2">
        {#each columns as column}
          <div class="flex justify-between gap-2">
            <span class="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">{column.header}</span>
            <span class="text-[13px] font-[var(--font-mono)] text-[var(--color-text-primary)] text-right">{getCellValue(row, column)}</span>
          </div>
        {/each}
      </div>
    {/each}
  </div>
{/if}
