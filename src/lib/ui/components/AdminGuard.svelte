<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/ui/stores/auth.svelte';
	import { useAdminRoute } from '$lib/ui/stores/guards.svelte';
	import { toastStore } from '$lib/ui/stores/toast.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';

	let { children }: { children: () => any } = $props();

	const t = $derived(localeStore.translation);
	const status = $derived(useAdminRoute(authStore));
	const redirecting = $derived(status === 'not-admin' || status === 'not-authenticated');

	$effect(() => {
		if (status === 'not-authenticated') {
			void goto('/auth/login');
		} else if (status === 'not-admin') {
			toastStore.error(t.auth.adminOnly);
			void goto('/auth/login');
		}
	});
</script>

{#if status === 'loading' || redirecting}
	<div class="flex justify-center py-[var(--space-12)]">
		<LoadingSpinner size="lg" />
	</div>
{:else if status === 'admin'}
	{@render children()}
{/if}
