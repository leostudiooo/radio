<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    value?: string;
    placeholder?: string;
    error?: string;
    type?: string;
    required?: boolean;
    disabled?: boolean;
    prefix?: Snippet;
    suffix?: Snippet;
    oninput?: (value: string) => void;
    onchange?: (value: string) => void;
  }

  let {
    label,
    value = $bindable(''),
    placeholder = '',
    error = '',
    type = 'text',
    required = false,
    disabled = false,
    prefix,
    suffix,
    oninput,
    onchange,
  }: Props = $props();

  const inputId = `input-${label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    oninput?.(value);
  }

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    onchange?.(target.value);
  }
</script>

<div class="flex flex-col gap-[var(--space-1)]">
  <label for={inputId} class="text-[var(--text-label)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
    {label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
  </label>
  <div class="flex items-center bg-[var(--color-elevated)] border border-[var(--color-border)] focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_1px_var(--color-accent-medium)] transition-colors duration-150">
    {#if prefix}
      <span class="pl-[var(--space-3)] text-[var(--color-text-muted)]">{@render prefix()}</span>
    {/if}
    <input
      id={inputId}
      {type}
      {placeholder}
      {required}
      {disabled}
      {value}
      oninput={handleInput}
      onchange={handleChange}
      class="flex-1 bg-transparent px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none disabled:opacity-40"
    />
    {#if suffix}
      <span class="pr-[var(--space-3)] text-[var(--color-text-muted)]">{@render suffix()}</span>
    {/if}
  </div>
  {#if error}
    <span class="text-[var(--text-caption)] text-[var(--color-status-invalid)]">{error}</span>
  {/if}
</div>
