<script lang="ts">
  interface Props {
    label: string;
    value?: string;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    rows?: number;
    maxLength?: number;
    oninput?: (value: string) => void;
  }

  let {
    label,
    value = $bindable(''),
    placeholder = '',
    error = '',
    required = false,
    disabled = false,
    rows = 3,
    maxLength,
    oninput,
  }: Props = $props();

  const textareaId = `textarea-${label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    value = target.value;
    oninput?.(value);
  }
</script>

<div class="flex flex-col gap-1">
  <label for={textareaId} class="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
    {label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
  </label>
  <textarea
    id={textareaId}
    {placeholder}
    {required}
    {disabled}
    {rows}
    maxlength={maxLength}
    {value}
    oninput={handleInput}
    class="w-full bg-[var(--color-elevated)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent-medium)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors duration-150 disabled:opacity-40 resize-y"
  ></textarea>
  {#if maxLength !== undefined}
    <span class="text-[10px] text-[var(--color-text-muted)] text-right">{value.length}/{maxLength}</span>
  {/if}
  {#if error}
    <span class="text-xs text-[var(--color-status-invalid)]">{error}</span>
  {/if}
</div>
