<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    options: Option[];
    value: string;
    onchange: (value: string) => void;
  }

  let { options, value, onchange }: Props = $props();
</script>

<div class="inline-flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full p-[var(--space-0-5)]">
  {#each options as option}
    <button
      type="button"
      onclick={() => onchange(option.value)}
      class="px-[var(--space-2)] py-[var(--space-0-5)] text-[var(--text-caption)] font-medium transition-all duration-100 {option.value === value
        ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)] rounded-full'
        : 'text-[var(--color-text-secondary)]'}"
    >
      {option.label}
    </button>
  {/each}
</div>
