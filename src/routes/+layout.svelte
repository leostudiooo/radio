<script lang="ts">
	import './layout.css';
	import { setContext } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { authStore } from '$lib/ui/stores/auth.svelte';
	import Toast from '$lib/ui/components/Toast.svelte';
	import AppHeader from '$lib/ui/components/AppHeader.svelte';
	import { SITE_CONFIG } from '$lib/config';
	import { fontStylesheetHrefs } from '$lib/generated/font-links';

	let { children } = $props();

	setContext('auth', authStore);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#each fontStylesheetHrefs as href}
		<link rel="stylesheet" {href} />
	{/each}
	<title>{SITE_CONFIG.siteTitle}</title>
</svelte:head>

<Toast />

<div class="flex min-h-screen flex-col">
	<AppHeader />

	<main
		class="mx-auto w-full max-w-[1200px] flex-1 px-[var(--space-4)] py-[var(--space-6)] sm:px-6 lg:px-8"
	>
		{@render children()}
	</main>
</div>
