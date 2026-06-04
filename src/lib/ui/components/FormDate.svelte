<script lang="ts">
  interface Props {
    label: string;
    value?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    onchange?: (value: string) => void;
  }

  let {
    label,
    value = $bindable(''),
    error = '',
    required = false,
    disabled = false,
    onchange,
  }: Props = $props();

  const dateId = `date-${label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    onchange?.(value);
  }
</script>

<div class="flex flex-col gap-[var(--space-1)]">
  <label for={dateId} class="text-[var(--text-label)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
    {label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
  </label>
  <input
    id={dateId}
    type="date"
    {required}
    {disabled}
    {value}
    onchange={handleChange}
    class="w-full bg-[var(--color-elevated)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent-medium)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-body)] text-[var(--color-text-primary)] outline-none transition-colors duration-150 disabled:opacity-40"
  />
  {#if error}
    <span class="text-[var(--text-caption)] text-[var(--color-status-invalid)]">{error}</span>
  {/if}
</div>
