<script lang="ts">
  import './layout.css';
  import { setContext } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import favicon from '$lib/assets/favicon.svg';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { toastStore } from '$lib/ui/stores/toast.svelte';
  import Toast from '$lib/ui/components/Toast.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import { Menu, X, Radio, Cpu, Mail, Settings, Download, User, LogOut, ChevronDown } from 'lucide-svelte';
  import { supabase } from '$lib/supabase';
  import { signOut } from '$lib/logic/auth';
  import { SITE_CONFIG } from '$lib/config';

  let { children } = $props();

  authStore.init();

  setContext('auth', authStore);

  let drawerOpen = $state(false);

  const navItems = [
    { path: '/qso', label: () => localeStore.translation.nav.qsoLog, icon: Radio },
    { path: '/equipment', label: () => localeStore.translation.nav.equipment, icon: Cpu },
    { path: '/qsl', label: () => localeStore.translation.nav.qsl, icon: Mail },
    { path: '/adif', label: 'ADIF', icon: Download },
    { path: '/settings', label: () => localeStore.translation.nav.settings, icon: Settings },
  ];

  function isActive(path: string): boolean {
    return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
  }

  function toggleDrawer() {
    drawerOpen = !drawerOpen;
  }

  function closeDrawer() {
    drawerOpen = false;
  }

  function switchLocale() {
    const next = localeStore.locale === 'en' ? 'zh' : 'en';
    localeStore.setLocale(next);
  }

  function handleNavClick(path: string) {
    closeDrawer();
    goto(path);
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{SITE_CONFIG.siteTitle}</title>
</svelte:head>

<Toast />

<div class="min-h-screen flex flex-col">
  <header class="shrink-0 h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-4">
    <button
      type="button"
      class="lg:hidden mr-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      aria-label="Toggle navigation"
      onclick={toggleDrawer}
    >
      {#if drawerOpen}
        <X size={20} />
      {:else}
        <Menu size={20} />
      {/if}
    </button>

    <a href="/" class="font-[var(--font-mono)] text-lg font-bold tracking-[0.05em] text-[var(--color-accent)] uppercase mr-8">
      {SITE_CONFIG.callsign}
    </a>

    <nav class="hidden lg:flex items-center gap-1 flex-1">
      {#each navItems as item}
        <a
          href={item.path}
          class="px-3 py-1.5 text-sm transition-colors duration-100 relative {isActive(item.path) ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
        >
          {#if isActive(item.path)}
            <span class="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-accent)]"></span>
          {/if}
          {typeof item.label === 'function' ? item.label() : item.label}
        </a>
      {/each}
    </nav>

    <div class="flex items-center gap-3 ml-auto">
      <button
        type="button"
        onclick={switchLocale}
        class="text-xs font-[var(--font-mono)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-100 uppercase"
      >
        {localeStore.locale === 'en' ? 'EN' : '中'}
      </button>

      {#if authStore.isAuthenticated}
        <div class="flex items-center gap-2">
          {#if authStore.callsign}
            <span class="text-xs font-[var(--font-mono)] text-[var(--color-text-secondary)]">{authStore.callsign}</span>
          {:else}
            <User size={16} class="text-[var(--color-text-secondary)]" />
          {/if}
          <button
            type="button"
            class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-status-invalid)] transition-colors duration-100"
            onclick={async () => { try { await signOut(supabase); goto('/auth/login'); } catch { /* ignore */ } } }
          >
            <LogOut size={14} />
          </button>
        </div>
      {:else}
        <a href="/auth/login" class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-100">
          {localeStore.translation.auth.login}
        </a>
      {/if}
    </div>
  </header>

  {#if drawerOpen}
    <button
      type="button"
      class="fixed inset-0 bg-black/80 z-40 lg:hidden"
      aria-label="Close navigation"
      onclick={closeDrawer}
    ></button>
    <aside class="fixed left-0 top-14 bottom-0 w-[240px] bg-[var(--color-surface)] border-r border-[var(--color-border)] z-50 lg:hidden flex flex-col py-4">
      {#each navItems as item}
        {@const Icon = item.icon}
        <button
          type="button"
          onclick={() => handleNavClick(item.path)}
          class="flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-100 relative text-left {isActive(item.path) ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
        >
          {#if isActive(item.path)}
            <span class="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-accent)]"></span>
          {/if}
          <Icon size={16} />
          <span>{typeof item.label === 'function' ? item.label() : item.label}</span>
        </button>
      {/each}
    </aside>
  {/if}

  <main class="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
    {@render children()}
  </main>
</div>
