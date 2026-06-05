<script lang="ts">
  import Button from './Button.svelte';

  interface Props {
    open?: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onconfirm?: () => void;
    oncancel?: () => void;
  }

  let {
    open = $bindable(false),
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onconfirm,
    oncancel,
  }: Props = $props();

  function handleConfirm() {
    open = false;
    onconfirm?.();
  }

  function handleCancel() {
    open = false;
    oncancel?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-title"
    onkeydown={handleKeydown}
  >
    <button
      type="button"
      class="absolute inset-0 bg-black/80"
      aria-label="Close dialog"
      onclick={handleCancel}
    ></button>
    <div class="relative w-full max-w-[480px] bg-[var(--color-surface)] border border-[var(--color-border)] p-[var(--space-6)] mx-[var(--space-4)]">
      <h2 id="confirm-title" class="text-[var(--text-subtitle)] font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-[var(--space-3)] mb-[var(--space-4)]">
        {title}
      </h2>
      <p class="text-[var(--text-body)] text-[var(--color-text-secondary)] mb-[var(--space-6)]">{message}</p>
      <div class="flex justify-end gap-[var(--space-3)]">
        <Button variant="ghost" onclick={handleCancel}>{cancelLabel}</Button>
        <Button variant="primary" onclick={handleConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  </div>
{/if}
