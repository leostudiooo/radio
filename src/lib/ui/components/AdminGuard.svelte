<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import { authStore } from '$lib/ui/stores/auth.svelte';
	import { useAdminRoute } from '$lib/ui/stores/guards.svelte';
	import { toastStore } from '$lib/ui/stores/toast.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';
	import Button from '$lib/ui/components/Button.svelte';

	let { children }: { children: Snippet } = $props();

	const t = $derived(localeStore.translation);
	const status = $derived(useAdminRoute(authStore));
	const redirecting = $derived(status === 'not-admin' || status === 'not-authenticated');

	$effect(() => {
		if (status === 'not-authenticated') {
			void goto(resolve('/auth/login'));
		} else if (status === 'not-admin') {
			toastStore.error(t.auth.adminOnly);
			void goto(resolve('/auth/login'));
		}
	});
</script>

{#if status === 'loading' || redirecting}
	<div class="flex justify-center py-[var(--space-12)]">
		<LoadingSpinner size="lg" />
	</div>
{:else if status === 'error'}
	<div class="flex flex-col items-center gap-[var(--space-3)] py-[var(--space-12)]">
		<p class="text-[var(--color-status-invalid)] text-[var(--text-body)]">{t.common.error}</p>
		<Button variant="secondary" onclick={() => authStore.refreshProfile()}>{t.common.retry}</Button>
	</div>
{:else if status === 'admin'}
	{@render children()}
{/if}
