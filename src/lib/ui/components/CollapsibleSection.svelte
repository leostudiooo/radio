<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		open?: boolean;
		children: Snippet;
	}

	let { title, open = $bindable(false), children }: Props = $props();

	function toggle() {
		open = !open;
	}
</script>

<div class="card-panel">
	<button
		type="button"
		onclick={toggle}
		aria-expanded={open}
		class="flex w-full items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-3)] text-left transition-colors duration-100 hover:bg-[var(--color-elevated)]"
	>
		<span class="font-mono text-[var(--color-accent)] text-[var(--text-body)]"
			>{open ? '[-]' : '[+]'}</span
		>
		<span class="font-medium text-[var(--color-text-primary)] text-[var(--text-body)]">{title}</span
		>
	</button>
	{#if open}
		<div
			class="border-t border-[var(--color-border)] px-[var(--space-4)] pt-[var(--space-1)] pb-[var(--space-4)]"
		>
			{@render children()}
		</div>
	{/if}
</div>
