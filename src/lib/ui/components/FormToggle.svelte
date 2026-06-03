<script lang="ts">
  interface Props {
    label: string;
    checked?: boolean;
    disabled?: boolean;
    onchange?: (checked: boolean) => void;
  }

  let {
    label,
    checked = $bindable(false),
    disabled = false,
    onchange,
  }: Props = $props();

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    checked = target.checked;
    onchange?.(checked);
  }
</script>

<label class="inline-flex items-center gap-2 cursor-pointer select-none group">
  <input
    type="checkbox"
    {disabled}
    {checked}
    onchange={handleChange}
    class="sr-only"
  />
  <span class="font-mono text-sm text-[var(--color-accent)] transition-colors duration-100">
    {checked ? '[x]' : '[ ]'}
  </span>
  <span class="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors duration-100">
    {label}
  </span>
</label>
