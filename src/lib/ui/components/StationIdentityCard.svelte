<script lang="ts">
	import { SITE_CONFIG } from '$lib/config';
	import { localeStore } from '$lib/ui/stores/locale.svelte';

	interface Props {
		profile: { callsign?: string; grid_square?: string; qth?: string; name?: string } | null;
	}

	let { profile }: Props = $props();

	const callsign = profile?.callsign ?? SITE_CONFIG.callsign;
	const grid_square = profile?.grid_square;
	const qth = profile?.qth;
</script>

<div class="card-panel p-[var(--space-6)]">
	<div class="flex flex-col gap-[var(--space-4)] md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="font-mono font-bold text-[var(--color-text-primary)] text-[var(--text-title)]">
				{callsign}
			</h1>
			<p class="mt-[var(--space-1)] text-[var(--color-text-secondary)] text-[var(--text-aux)]">
				{localeStore.translation.common.station}
			</p>
		</div>
		<div
			class="flex flex-wrap gap-[var(--space-4)] text-[var(--color-text-secondary)] text-[var(--text-aux)]"
		>
			{#if grid_square}
				<span>{localeStore.translation.common.grid}: {grid_square}</span>
			{/if}
			{#if qth}
				<span>{localeStore.translation.common.qth}: {qth}</span>
			{/if}
		</div>
	</div>
</div>
