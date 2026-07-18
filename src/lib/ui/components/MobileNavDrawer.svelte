<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import SegmentedToggle from './SegmentedToggle.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import UserDropdown from './UserDropdown.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { settingsStore } from '$lib/ui/stores/settings.svelte';
	import { authStore } from '$lib/ui/stores/auth.svelte';
	import { handleLogout as doLogout } from '$lib/logic/auth';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	interface NavItem {
		path: string;
		label: string | (() => string);
		icon: LucideIcon;
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
	let drawerRef = $state<HTMLElement>();

	function switchLocale(value: string) {
		localeStore.setLocale(value as 'en' | 'zh');
	}

	function onBackdropClick() {
		onclose();
	}

	function getFocusable(): HTMLElement[] {
		if (!drawerRef) return [];
		return [
			...drawerRef.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])')
		] as HTMLElement[];
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
			return;
		}
		if (e.key === 'Tab') {
			const focusable = getFocusable();
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('keydown', onKeydown);
			const focusable = getFocusable();
			if (focusable.length > 0) {
				setTimeout(() => focusable[0].focus(), 0);
			}
		} else {
			document.removeEventListener('keydown', onKeydown);
		}
		return () => document.removeEventListener('keydown', onKeydown);
	});
</script>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-[var(--color-backdrop)] lg:hidden"
		aria-label={localeStore.translation.common.closeNav}
		onclick={onBackdropClick}
	></button>
	<aside
		bind:this={drawerRef}
		class="fixed top-14 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:hidden"
	>
		<div class="flex-1 py-[var(--space-4)]">
			{#each publicNavItems as item (item.path)}
				{@const Icon = item.icon}
				<button
					type="button"
					onclick={() => handleNavClick(item.path)}
					class="flex w-full items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] text-left text-[var(--text-body)] transition-colors duration-100 {isActive(
						item.path
					)
						? 'border-l-2 border-[var(--color-accent)] text-[var(--color-text-primary)]'
						: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'}"
				>
					<Icon size={16} />
					<span>{typeof item.label === 'function' ? item.label() : item.label}</span>
				</button>
			{/each}
			{#if authStore.isAdmin}
				{#each adminNavItems as item (item.path)}
					{@const Icon = item.icon}
					<button
						type="button"
						onclick={() => handleNavClick(item.path)}
						class="flex w-full items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] text-left text-[var(--text-body)] transition-colors duration-100 {isActive(
							item.path
						)
							? 'border-l-2 border-[var(--color-accent)] text-[var(--color-text-primary)]'
							: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'}"
					>
						<Icon size={16} />
						<span>{typeof item.label === 'function' ? item.label() : item.label}</span>
					</button>
				{/each}
			{/if}
		</div>

		<div class="space-y-4 border-t border-[var(--color-border)] p-[var(--space-4)]">
			{#if authStore.isAuthenticated}
				<UserDropdown
					callsign={authStore.callsign ?? ''}
					onlogout={() => doLogout(supabase, goto)}
				/>
			{:else}
				<a
					href={resolve('/auth/login')}
					class="text-[var(--color-text-secondary)] text-[var(--text-body)] transition-colors duration-100 hover:text-[var(--color-text-primary)]"
				>
					{localeStore.translation.auth.login}
				</a>
			{/if}

			<div class="flex flex-wrap items-center gap-[var(--space-2)]">
				<ThemeToggle />
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
			</div>
		</div>
	</aside>
{/if}
