<script lang="ts">
	import { SITE_CONFIG } from '$lib/config';
	import Terminal from '$lib/ui/components/Terminal.svelte';
	import { localeStore } from '$lib/ui/stores/locale.svelte';

	const t = $derived(localeStore.translation);
	let skipSignal = $state(0);
	let terminalComplete = $state(false);
</script>

<svelte:head>
	<title>{SITE_CONFIG.siteTitle}</title>
</svelte:head>

<div
	class="relative flex min-h-[calc(100vh-3.5rem-var(--space-12))] items-center justify-center supports-[height:100dvh]:min-h-[calc(100dvh-3.5rem-var(--space-12))]"
>
	{#if !terminalComplete}
		<button
			type="button"
			class="absolute top-[var(--space-4)] right-[var(--space-4)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--color-text-muted)] text-[var(--text-aux)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
			data-testid="terminal-skip"
			onclick={() => {
				skipSignal += 1;
			}}
			aria-label={t.terminal.skip}
		>
			{t.terminal.skip}
		</button>
	{/if}

	<Terminal
		{skipSignal}
		oncomplete={() => {
			terminalComplete = true;
		}}
	/>
</div>
