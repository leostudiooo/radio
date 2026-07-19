<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import { AUTH_DEADLINE_MS, withDeadline } from '$lib/logic/deadline';
	import { SITE_CONFIG } from '$lib/config';

	const t = $derived(localeStore.translation);
	let failed = $state(false);
	let loading = $state(true);

	async function completeCallback() {
		failed = false;
		loading = true;
		try {
			const { data, error } = await withDeadline('complete authentication', AUTH_DEADLINE_MS, () =>
				supabase.auth.getSession()
			);
			if (error) throw error;
			await goto(data.session ? '/settings' : '/auth/login');
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void completeCallback();
	});
</script>

<svelte:head>
	<title>{SITE_CONFIG.callsign}</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-[var(--space-3)]">
	{#if loading}
		<LoadingSpinner size="lg" />
	{:else if failed}
		<p class="text-[var(--color-status-invalid)] text-[var(--text-body)]">{t.common.error}</p>
		<Button variant="secondary" onclick={completeCallback}>{t.common.retry}</Button>
	{/if}
</div>
