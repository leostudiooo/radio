<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { settingsStore } from '$lib/ui/stores/settings.svelte';
  import { SITE_CONFIG } from '$lib/config';
  import { Menu, X, Radio, Cpu, Mail, Download } from '@lucide/svelte';
  import SegmentedToggle from './SegmentedToggle.svelte';
  import UserDropdown from './UserDropdown.svelte';
  import { handleLogout as doLogout } from '$lib/logic/auth';
  import { supabase } from '$lib/supabase';
  import MobileNavDrawer from './MobileNavDrawer.svelte';

  const t = $derived(localeStore.translation);

  let drawerOpen = $state(false);

  const publicNavItems = [
    { path: '/qso', label: () => localeStore.translation.nav.qsoLog, icon: Radio },
    { path: '/equipment', label: () => localeStore.translation.nav.equipment, icon: Cpu },
    { path: '/qsl', label: () => localeStore.translation.nav.qsl, icon: Mail },
  ];

  const adminNavItems = [
    { path: '/adif', label: () => localeStore.translation.adif.title, icon: Download },
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

  function switchLocale(value: string) {
    localeStore.setLocale(value as 'en' | 'zh');
  }

  function handleNavClick(path: string) {
    closeDrawer();
    goto(path);
  }
</script>

<header class="sticky top-0 z-30 shrink-0 h-14 bg-[var(--color-base)] border-b border-[var(--color-border)] flex items-center px-[var(--space-4)]">
  <button
    type="button"
    class="lg:hidden mr-[var(--space-3)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
    aria-label={localeStore.translation.common.toggleNav}
    onclick={toggleDrawer}
  >
    {#if drawerOpen}
      <X size={20} />
    {:else}
      <Menu size={20} />
    {/if}
  </button>

  <a href="/" class="font-[var(--font-mono)] text-[var(--text-subtitle)] font-bold tracking-[0.05em] text-[var(--color-text-primary)] uppercase mr-[var(--space-8)]">
    {SITE_CONFIG.callsign}
  </a>

  <nav class="hidden lg:flex items-center gap-[var(--space-1)] flex-1">
    {#each publicNavItems as item}
      <a
        href={item.path}
        class="px-[var(--space-3)] py-[0.375rem] transition-colors duration-100 text-[var(--text-body)] {isActive(item.path) ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'}"
      >
        {typeof item.label === 'function' ? item.label() : item.label}
      </a>
    {/each}
    {#if authStore.isAdmin}
      {#each adminNavItems as item}
        <a
          href={item.path}
          class="px-[var(--space-3)] py-[0.375rem] transition-colors duration-100 text-[var(--text-body)] {isActive(item.path) ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'}"
        >
          {typeof item.label === 'function' ? item.label() : item.label}
        </a>
      {/each}
    {/if}
  </nav>

  <div class="flex items-center gap-[var(--space-3)] ml-auto">
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

    {#if !authStore.loading}
      {#if authStore.isAuthenticated}
        <UserDropdown callsign={authStore.callsign ?? ''} onlogout={() => doLogout(supabase, goto)} />
      {:else}
        <a href="/auth/login" class="text-[var(--text-body)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-100">
          {localeStore.translation.auth.login}
        </a>
      {/if}
    {/if}
  </div>
</header>

<MobileNavDrawer
  open={drawerOpen}
  onclose={closeDrawer}
  {publicNavItems}
  {adminNavItems}
  {isActive}
  {handleNavClick}
/>
