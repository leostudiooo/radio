<script lang="ts">
  import type { Component } from 'svelte';
  import { Radio, Cpu, Mail, Download } from 'lucide-svelte';
  import SegmentedToggle from './SegmentedToggle.svelte';
  import UserDropdown from './UserDropdown.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { settingsStore } from '$lib/ui/stores/settings.svelte';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { handleLogout as doLogout } from '$lib/logic/auth';
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  interface NavItem {
    path: string;
    label: string | (() => string);
    icon: Component<{ size?: number; class?: string }>;
  }

  interface Props {
    open: boolean;
    onclose: () => void;
    publicNavItems: NavItem[];
    adminNavItems: NavItem[];
    isActive: (path: string) => boolean;
    handleNavClick: (path: string) => void;
  }

  let { open, onclose, publicNavItems, adminNavItems, isActive, handleNavClick }: Props = $props();

  function switchLocale(value: string) {
    localeStore.setLocale(value as 'en' | 'zh');
  }

  function onBackdropClick() {
    onclose();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose();
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener('keydown', onKeydown);
    } else {
      document.removeEventListener('keydown', onKeydown);
    }
    return () => document.removeEventListener('keydown', onKeydown);
  });
</script>

{#if open}
  <button
    type="button"
    class="fixed inset-0 bg-black/80 z-40 lg:hidden"
    aria-label={localeStore.translation.common.closeNav}
    onclick={onBackdropClick}
  ></button>
  <aside class="fixed left-0 top-14 bottom-0 w-[240px] bg-[var(--color-surface)] border-r border-[var(--color-border)] z-50 lg:hidden flex flex-col">
    <div class="flex-1 py-4">
      {#each publicNavItems as item}
        {@const Icon = item.icon}
        <button
          type="button"
          onclick={() => handleNavClick(item.path)}
          class="flex items-center gap-3 px-4 py-3 text-[var(--text-body)] transition-colors duration-100 text-left w-full {isActive(item.path) ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'}"
        >
          <Icon size={16} />
          <span>{typeof item.label === 'function' ? item.label() : item.label}</span>
        </button>
      {/each}
      {#if authStore.isAdmin}
        {#each adminNavItems as item}
          {@const Icon = item.icon}
          <button
            type="button"
            onclick={() => handleNavClick(item.path)}
            class="flex items-center gap-3 px-4 py-3 text-[var(--text-body)] transition-colors duration-100 text-left w-full {isActive(item.path) ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'}"
          >
            <Icon size={16} />
            <span>{typeof item.label === 'function' ? item.label() : item.label}</span>
          </button>
        {/each}
      {/if}
    </div>

    <div class="border-t border-[var(--color-border)] p-4 space-y-4">
      {#if authStore.isAuthenticated}
        <UserDropdown callsign={authStore.callsign ?? ''} onlogout={() => doLogout(supabase, goto)} />
      {:else}
        <a href="/auth/login" class="text-[var(--text-body)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-100">
          {localeStore.translation.auth.login}
        </a>
      {/if}

      <div class="flex items-center gap-2">
        <SegmentedToggle
          options={[{ value: 'utc', label: 'UTC' }, { value: 'lcl', label: 'LCL' }]}
          value={settingsStore.useLocalTime ? 'lcl' : 'utc'}
          onchange={() => settingsStore.toggleUseLocalTime()}
        />
        <SegmentedToggle
          options={[{ value: 'en', label: 'EN' }, { value: 'zh', label: '中' }]}
          value={localeStore.locale}
          onchange={switchLocale}
        />
      </div>
    </div>
  </aside>
{/if}
