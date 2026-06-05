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

  const timeId = `time-${label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    onchange?.(value);
  }
</script>

<div class="flex flex-col gap-[var(--space-1)]">
  <label for={timeId} class="text-[var(--text-body)] font-medium uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
    {label}{#if required}<span class="text-[var(--color-status-invalid)]">*</span>{/if}
  </label>
  <input
    id={timeId}
    type="time"
    {required}
    {disabled}
    {value}
    onchange={handleChange}
    class="input-field"
  />
  {#if error}
    <span class="text-[var(--text-body)] text-[var(--color-status-invalid)]">{error}</span>
  {/if}
</div>
