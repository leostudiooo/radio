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

<div class="flex flex-col gap-[var(--space-1)]">
  <label for={textareaId} class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
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
    class="input-field placeholder:text-[var(--color-text-muted)] resize-y"
  ></textarea>
  {#if maxLength !== undefined}
    <span class="text-[var(--text-aux)] text-[var(--color-text-muted)] text-right">{value.length}/{maxLength}</span>
  {/if}
  {#if error}
    <span class="text-[var(--text-body)] text-[var(--color-status-invalid)]">{error}</span>
  {/if}
</div>
