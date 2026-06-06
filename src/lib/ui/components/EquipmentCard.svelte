<script lang="ts">
	import type { Equipment } from '$lib/logic/types/equipment';
	import { localeStore } from '$lib/ui/stores/locale.svelte';

	interface Props {
		equipment: Equipment;
	}

	let { equipment }: Props = $props();
</script>

<div class="card-panel p-[var(--space-3)]">
	<div class="flex items-center justify-between">
		<div>
			<span class="font-medium text-[var(--color-text-primary)] text-[var(--text-body)]"
				>{equipment.name}</span
			>
			<span class="ml-[var(--space-2)] text-[var(--color-text-secondary)] text-[var(--text-aux)]"
				>{equipment.type}</span
			>
		</div>
		{#if equipment.is_active}
			<span class="text-[var(--color-success)] text-[var(--text-body)]"
				>{localeStore.translation.equipment.active}</span
			>
		{/if}
	</div>
</div>
