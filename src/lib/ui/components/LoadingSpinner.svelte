<script lang="ts">
  interface Props {
    size?: 'sm' | 'md' | 'lg';
  }

  let { size = 'md' }: Props = $props();

  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const s = sizeMap[size];
</script>

<svg
  width={s}
  height={s}
  viewBox="0 0 24 24"
  class="animate-spin"
  xmlns="http://www.w3.org/2000/svg"
>
  <circle
    cx="12"
    cy="12"
    r="10"
    stroke="var(--color-border)"
    stroke-width="2"
    fill="none"
  />
  <path
    d="M12 2a10 10 0 0 1 10 10"
    stroke="var(--color-accent)"
    stroke-width="2"
    fill="none"
    stroke-linecap="round"
  />
</svg>
