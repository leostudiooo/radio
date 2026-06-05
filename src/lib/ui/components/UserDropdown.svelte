<script lang="ts">
  import { localeStore } from '$lib/ui/stores/locale.svelte';

  interface Props {
    callsign: string;
    onlogout: () => void;
  }

  let { callsign, onlogout }: Props = $props();
  let open = $state(false);

  function toggle() {
    open = !open;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
    }
  }

  function handleMenuKeydown(e: KeyboardEvent) {
    const menu = (e.currentTarget as HTMLElement);
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    if (items.length === 0) return;

    const active = document.activeElement;
    const current = items.indexOf(active as HTMLElement);
    let next = -1;

    switch (e.key) {
      case 'ArrowDown':
        next = current >= items.length - 1 ? 0 : current + 1;
        break;
      case 'ArrowUp':
        next = current <= 0 ? items.length - 1 : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    items[next].focus();
  }

  function handleBackdropClick() {
    open = false;
  }

  $effect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeydown);
    } else {
      document.removeEventListener('keydown', handleKeydown);
    }
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-40" onclick={handleBackdropClick} onkeydown={() => {}}></div>
{/if}

<div class="relative inline-block">
  <button
    type="button"
    onclick={toggle}
    class="inline-flex items-center gap-1 text-[var(--text-body)] text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-100 font-[var(--font-body)]"
    aria-expanded={open}
    aria-haspopup="true"
  >
    {callsign}
    <span class="text-[var(--color-text-secondary)]" aria-hidden="true">&#9662;</span>
  </button>

  {#if open}
    <div
      class="absolute right-0 mt-1 min-w-[10rem] bg-[var(--color-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg z-50"
      role="menu"
      tabindex="-1"
      onkeydown={handleMenuKeydown}
    >
      <a
        href="/settings"
        class="block px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-body)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors duration-100"
        role="menuitem"
        tabindex="-1"
      >
        {localeStore.translation.nav.settings}
      </a>
      <div class="border-t border-[var(--color-border)] my-1"></div>
      <button
        type="button"
        onclick={() => { open = false; onlogout(); }}
        class="block w-full text-left px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-body)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors duration-100"
        role="menuitem"
        tabindex="-1"
      >
        {localeStore.translation.nav.logout}
      </button>
    </div>
  {/if}
</div>
