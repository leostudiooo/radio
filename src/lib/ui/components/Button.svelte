<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
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
    sm: 'h-[32px] px-3 text-xs',
    md: 'h-[40px] px-4 text-sm',
    lg: 'h-[48px] px-6 text-sm',
  };

  const variantClasses = {
    primary: 'bg-[var(--color-accent)] text-[var(--color-base)] font-semibold hover:bg-[var(--color-accent-hover)]',
    secondary: 'bg-transparent border border-[var(--color-accent)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-subtle)]',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
  };
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="inline-flex items-center justify-center gap-2 transition-all duration-100 ease-out font-[var(--font-body)] disabled:opacity-40 disabled:cursor-not-allowed {sizeClasses[size]} {variantClasses[variant]}"
>
  {@render children?.()}
</button>
