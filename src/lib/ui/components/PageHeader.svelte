<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		action?: Snippet;
	}

	let { title, subtitle, action }: Props = $props();
</script>

<div class="mb-[var(--space-6)] flex flex-col gap-[var(--space-1)]">
	<div class="flex items-center justify-between gap-[var(--space-4)]">
		<h1 class="font-semibold text-[var(--color-text-primary)] text-[var(--text-title)]">{title}</h1>
		{#if action}
			{@render action()}
		{/if}
	</div>
	{#if subtitle}
		<p class="text-[var(--color-text-secondary)] text-[var(--text-body)]">{subtitle}</p>
	{/if}
</div>
