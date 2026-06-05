<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    onclick,
    children,
  }: Props = $props();

  const sizeClasses = {
    sm: 'h-[var(--height-control-sm)] px-[var(--space-3)] text-[var(--text-body)]',
    md: 'h-[var(--height-control-md)] px-[var(--space-4)] text-[var(--text-body)]',
    lg: 'h-[var(--height-control-lg)] px-[var(--space-6)] text-[var(--text-body)]',
    icon: 'w-[var(--height-control-md)] h-[var(--height-control-md)] p-0',
  };

  const variantClasses = {
    primary: 'bg-[var(--color-accent)] font-semibold hover:bg-[var(--color-accent-hover)]',
    secondary: 'bg-transparent border border-[var(--color-accent)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-subtle)]',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
  };
</script>

<button
  {type}
  {disabled}
  {onclick}
  style={variant === 'primary' ? 'color: var(--color-text-on-accent)' : ''}
  class="inline-flex items-center justify-center gap-[var(--space-2)] transition-all duration-100 ease-out font-[var(--font-body)] disabled:opacity-40 disabled:cursor-not-allowed {sizeClasses[size]} {variantClasses[variant]}"
>
  {@render children?.()}
</button>
