<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import LoadingSpinner from '$lib/ui/components/LoadingSpinner.svelte';

	onMount(() => {
		void goto(resolve('/qso/confirm/[code]', { code: $page.params.code! }), {
			replaceState: true
		});
	});
</script>

<div class="flex justify-center py-[var(--space-12)]">
	<LoadingSpinner size="lg" />
</div>
