<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
	<button
		type="button"
		class="absolute top-[var(--space-4)] right-[var(--space-4)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--color-text-muted)] text-[var(--text-aux)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
		data-testid={terminalComplete ? 'terminal-view-qso' : 'terminal-skip'}
		onclick={() => {
			if (terminalComplete) {
				goto(resolve('/qso'));
			} else {
				skipSignal += 1;
			}
		}}
		aria-label={terminalComplete ? t.terminal.viewQsos : t.terminal.skip}
	>
		{terminalComplete ? t.terminal.viewQsos : t.terminal.skip}
	</button>

	<Terminal
		{skipSignal}
		oncomplete={() => {
			terminalComplete = true;
		}}
	/>
</div>
