<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    label: string;
    value?: string;
    options: Option[];
    error?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    onchange?: (value: string) => void;
  }

  let {
    label,
    value = $bindable(''),
    options,
    error = '',
    required = false,
    disabled = false,
    placeholder = '',
    onchange,
  }: Props = $props();

  const selectId = `select-${label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;

  function handleChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    value = target.value;
    onchange?.(value);
  }
</script>

<div class="flex flex-col gap-[var(--space-1)]">
  <label for={selectId} class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
    {label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
  </label>
  <div class="relative">
    <select
      id={selectId}
      {required}
      {disabled}
      {value}
      onchange={handleChange}
      class="w-full appearance-none bg-[var(--color-elevated)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent-medium)] px-[var(--space-3)] py-[var(--space-2)] pr-10 text-[var(--text-body)] text-[var(--color-text-primary)] outline-none transition-colors duration-150 disabled:opacity-40"
    >
      {#if placeholder}
        <option value="" disabled selected={!value}>{placeholder}</option>
      {/if}
      {#each options as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <span class="absolute right-[var(--space-3)] top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]">
      <ChevronDown size={16} />
    </span>
  </div>
  {#if error}
    <span class="text-[var(--text-body)] text-[var(--color-status-invalid)]">{error}</span>
  {/if}
</div>
