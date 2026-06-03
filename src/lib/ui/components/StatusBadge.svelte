<script lang="ts">
  type Status = 'pending' | 'sent' | 'received' | 'confirmed' | 'invalid';

  interface Props {
    status: Status;
    label?: string;
  }

  let { status, label }: Props = $props();

  const statusConfig: Record<Status, { bg: string; text: string; border: string }> = {
    pending: {
      bg: 'var(--color-status-pending-bg)',
      text: 'var(--color-text-primary)',
      border: 'var(--color-status-pending-border)',
    },
    sent: {
      bg: 'var(--color-status-sent-bg)',
      text: 'var(--color-status-sent)',
      border: 'var(--color-status-sent-border)',
    },
    received: {
      bg: 'var(--color-status-received-bg)',
      text: 'var(--color-status-received)',
      border: 'var(--color-status-received-border)',
    },
    confirmed: {
      bg: 'var(--color-status-confirmed-bg)',
      text: 'var(--color-status-confirmed)',
      border: 'var(--color-status-confirmed-border)',
    },
    invalid: {
      bg: 'var(--color-status-invalid-bg)',
      text: 'var(--color-status-invalid)',
      border: 'var(--color-status-invalid-border)',
    },
  };

  const config = statusConfig[status];
  const displayLabel = label ?? status.toUpperCase();
</script>

<span
  class="inline-block px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em]"
  style="background-color: {config.bg}; color: {config.text}; border: 1px solid {config.border};"
>
  {displayLabel}
</span>
