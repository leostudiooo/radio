<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/ui/stores/auth.svelte';
  import { localeStore } from '$lib/ui/stores/locale.svelte';
  import { settingsStore } from '$lib/ui/stores/settings.svelte';
  import { SITE_CONFIG } from '$lib/config';
  import { Menu, X, Radio, Cpu, Mail, Download } from 'lucide-svelte';
  import SegmentedToggle from './SegmentedToggle.svelte';
  import UserDropdown from './UserDropdown.svelte';
  import { signOut } from '$lib/logic/auth';
  import { supabase } from '$lib/supabase';
  import MobileNavDrawer from './MobileNavDrawer.svelte';

  let drawerOpen = $state(false);
  let authResolved = $state(false);

  $effect(() => {
    const id = setTimeout(() => {
      authResolved = true;
    }, 50);
    return () => clearTimeout(id);
  });

  const publicNavItems = [
    { path: '/qso', label: () => localeStore.translation.nav.qsoLog, icon: Radio },
    { path: '/equipment', label: () => localeStore.translation.nav.equipment, icon: Cpu },
    { path: '/qsl', label: () => localeStore.translation.nav.qsl, icon: Mail },
  ];

  const adminNavItems = [
    { path: '/adif', label: 'ADIF', icon: Download },
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

  async function handleLogout() {
    try {
      await signOut(supabase);
      goto('/auth/login');
    } catch {}
  }
</script>

<header class="sticky top-0 z-30 shrink-0 h-14 bg-[var(--color-base)] border-b border-[var(--color-border)] flex items-center px-4">
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

  <a href="/" class="font-[var(--font-mono)] text-[var(--text-subtitle)] font-bold tracking-[0.05em] text-[var(--color-accent)] uppercase mr-8">
    {SITE_CONFIG.callsign}
  </a>

  <nav class="hidden lg:flex items-center gap-1 flex-1">
    {#each publicNavItems as item}
      <a
        href={item.path}
        class="px-3 py-1.5 rounded-md transition-colors duration-100 text-[var(--text-body)] {isActive(item.path) ? 'text-[var(--color-text-primary)] bg-[var(--color-accent-subtle)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'}"
      >
        {typeof item.label === 'function' ? item.label() : item.label}
      </a>
    {/each}
    {#if authStore.isAdmin}
      {#each adminNavItems as item}
        <a
          href={item.path}
          class="px-3 py-1.5 rounded-md transition-colors duration-100 text-[var(--text-body)] {isActive(item.path) ? 'text-[var(--color-text-primary)] bg-[var(--color-accent-subtle)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'}"
        >
          {typeof item.label === 'function' ? item.label() : item.label}
        </a>
      {/each}
    {/if}
  </nav>

  <div class="flex items-center gap-3 ml-auto">
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

    {#if authResolved}
      {#if authStore.isAuthenticated}
        <UserDropdown callsign={authStore.callsign ?? ''} onlogout={handleLogout} />
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
