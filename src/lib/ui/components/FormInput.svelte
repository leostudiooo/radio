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

<div class="flex flex-col gap-1">
  <label for={inputId} class="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
    {label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
  </label>
  <div class="flex items-center bg-[var(--color-elevated)] border border-[var(--color-border)] focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_1px_var(--color-accent-medium)] transition-colors duration-150">
    {#if prefix}
      <span class="pl-3 text-[var(--color-text-muted)]">{@render prefix()}</span>
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
      class="flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none disabled:opacity-40"
    />
    {#if suffix}
      <span class="pr-3 text-[var(--color-text-muted)]">{@render suffix()}</span>
    {/if}
  </div>
  {#if error}
    <span class="text-xs text-[var(--color-status-invalid)]">{error}</span>
  {/if}
</div>
