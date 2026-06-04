<script lang="ts">
  interface Props {
    value: string | number;
    label: string;
  }

  let { value, label }: Props = $props();
</script>

<div class="bg-[var(--color-surface)] border border-[var(--color-border)] p-[var(--space-4)] flex flex-col gap-[var(--space-1)]">
  <span class="text-[var(--text-stat)] font-semibold text-[var(--color-text-primary)] font-[var(--font-mono)]">
    {value}
  </span>
  <span class="text-[var(--text-caption)] uppercase tracking-wide text-[var(--color-text-muted)]">
    {label}
  </span>
</div>
