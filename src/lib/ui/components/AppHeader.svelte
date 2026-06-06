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
		{ path: '/qsl', label: () => localeStore.translation.nav.qsl, icon: Mail }
	];

	const adminNavItems = [
		{ path: '/adif', label: () => localeStore.translation.adif.title, icon: Download }
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

<header
	class="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-base)] px-[var(--space-4)]"
>
	<button
		type="button"
		class="mr-[var(--space-3)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] lg:hidden"
		aria-label={localeStore.translation.common.toggleNav}
		onclick={toggleDrawer}
	>
		{#if drawerOpen}
			<X size={20} />
		{:else}
			<Menu size={20} />
		{/if}
	</button>

	<a
		href="/"
		class="mr-[var(--space-8)] font-mono font-bold tracking-[0.05em] text-[var(--color-text-primary)] text-[var(--text-subtitle)] uppercase"
	>
		{SITE_CONFIG.callsign}
	</a>

	<nav class="hidden h-full flex-1 items-stretch gap-[var(--space-1)] lg:flex">
		{#each publicNavItems as item}
			<a
				href={item.path}
				class="flex items-center px-[var(--space-3)] text-[var(--text-body)] transition-colors duration-100 {isActive(
					item.path
				)
					? 'border-b-2 border-[var(--color-accent)] text-[var(--color-text-primary)]'
					: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'}"
			>
				{typeof item.label === 'function' ? item.label() : item.label}
			</a>
		{/each}
		{#if authStore.isAdmin}
			{#each adminNavItems as item}
				<a
					href={item.path}
					class="flex items-center px-[var(--space-3)] text-[var(--text-body)] transition-colors duration-100 {isActive(
						item.path
					)
						? 'border-b-2 border-[var(--color-accent)] text-[var(--color-text-primary)]'
						: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'}"
				>
					{typeof item.label === 'function' ? item.label() : item.label}
				</a>
			{/each}
		{/if}
	</nav>

	<div class="ml-auto hidden items-center gap-[var(--space-3)] lg:flex">
		<SegmentedToggle
			options={[
				{ value: 'utc', label: 'UTC' },
				{ value: 'lcl', label: 'LCL' }
			]}
			value={settingsStore.useLocalTime ? 'lcl' : 'utc'}
			onchange={() => settingsStore.toggleUseLocalTime()}
		/>
		<SegmentedToggle
			options={[
				{ value: 'en', label: 'EN' },
				{ value: 'zh', label: '中' }
			]}
			value={localeStore.locale}
			onchange={switchLocale}
		/>

		{#if !authStore.loading}
			{#if authStore.isAuthenticated}
				<UserDropdown
					callsign={authStore.callsign ?? ''}
					onlogout={() => doLogout(supabase, goto)}
				/>
			{:else}
				<a
					href="/auth/login"
					class="text-[var(--color-text-secondary)] text-[var(--text-body)] transition-colors duration-100 hover:text-[var(--color-text-primary)]"
				>
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
