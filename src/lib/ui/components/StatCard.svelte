<script lang="ts">
  interface Props {
    value: string | number;
    label: string;
  }

  let { value, label }: Props = $props();
</script>

<div class="card-panel p-[var(--space-4)] flex flex-col gap-[var(--space-1)]">
  <span class="text-[var(--text-title)] font-semibold text-[var(--color-text-primary)] font-[var(--font-mono)]">
    {value}
  </span>
  <span class="text-[var(--text-body)] uppercase tracking-wide text-[var(--color-text-muted)]">
    {label}
  </span>
</div>
