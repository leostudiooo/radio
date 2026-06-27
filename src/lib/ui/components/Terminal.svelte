<script lang="ts">
	import { onMount } from 'svelte';
	import { createBrowserTerminalSession, type TerminalSession } from './terminalSession';
	import { createStationOS } from '$lib/ui/os';
	import { createBrowserStationOSAdapters } from '$lib/ui/os/browserAdapter';
	import siteEntries from 'virtual:station-site-fs';
	import staticEntries from 'virtual:station-static-fs';

	let { skipSignal = 0, oncomplete = () => {} }: { skipSignal?: number; oncomplete?: () => void } =
		$props();

	type WTermInstance = import('@wterm/dom').WTerm;

	let terminalHost = $state<HTMLElement>();
	let terminal = $state<WTermInstance>();
	let session = $state<TerminalSession>();
	let lastSkipSignal = $state(0);
	let completionNotified = $state(false);

	function notifyComplete() {
		if (completionNotified) return;
		completionNotified = true;
		oncomplete();
	}

	function skip() {
		session?.skip();
	}

	$effect(() => {
		if (skipSignal === lastSkipSignal) return;
		lastSkipSignal = skipSignal;
		skip();
	});

	onMount(() => {
		let disposed = false;

		async function initTerminal() {
			if (!terminalHost) return;

			const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			const { WTerm } = await import('@wterm/dom');
			if (disposed || !terminalHost) return;

			const term = new WTerm(terminalHost, {
				cols: 80,
				rows: 24,
				autoResize: false,
				cursorBlink: true,
				onData: (data) => {
					session?.input(data);
				}
			});

			await term.init();
			if (disposed) {
				term.destroy();
				return;
			}

			const os = createStationOS({
				adapters: createBrowserStationOSAdapters((data) => {
					if (!disposed) term.write(data);
				}),
				siteEntries,
				staticEntries
			});
			const browserSession = createBrowserTerminalSession(
				os,
				(data) => term.write(data),
				notifyComplete
			);

			terminal = term;
			session = browserSession;
			void browserSession.start({ instant: reducedMotion });
			term.focus();
		}

		void initTerminal();

		return () => {
			disposed = true;
			session?.dispose();
			terminal?.destroy();
		};
	});
</script>

<div class="card-panel terminal-card mx-auto w-full p-0" data-testid="terminal-card">
	<div
		bind:this={terminalHost}
		class="station-terminal w-full overflow-hidden"
		data-testid="terminal-output"
		role="log"
		aria-live="polite"
	></div>
</div>

<style>
	.station-terminal {
		--term-fg: var(--color-text-primary);
		--term-bg: transparent;
		--term-cursor: var(--color-text-primary);
		--term-color-0: var(--color-base);
		--term-color-1: var(--color-danger);
		--term-color-2: var(--color-accent);
		--term-color-3: var(--color-status-confirmed);
		--term-color-4: var(--color-status-sent);
		--term-color-5: var(--color-text-secondary);
		--term-color-6: var(--color-accent);
		--term-color-7: var(--color-text-primary);
		--term-color-8: var(--color-text-muted);
		--term-color-9: var(--color-danger);
		--term-color-10: var(--color-accent);
		--term-color-11: var(--color-status-confirmed);
		--term-color-12: var(--color-status-sent);
		--term-color-13: var(--color-text-secondary);
		--term-color-14: var(--color-accent);
		--term-color-15: var(--color-text-primary);
		--term-font-family: var(--font-mono);
		--term-font-size: var(--text-body);
		--term-line-height: var(--line-height-tight);
		--term-row-height: calc(var(--text-body) * var(--line-height-tight));
	}

	.terminal-card {
		--terminal-cols: 80;
		--terminal-rows: 24;
		--terminal-cell-width: 0.5em;
		--terminal-padding-x: calc(var(--space-6) * 2);
		--terminal-padding-y: calc(var(--space-6) * 2);
		font-family: var(--font-mono);
		font-size: var(--text-body);
		max-width: calc(
			(var(--terminal-cell-width) * var(--terminal-cols)) + var(--terminal-padding-x)
		);
		max-height: calc(
			(var(--text-body) * var(--line-height-tight) * var(--terminal-rows)) +
				var(--terminal-padding-y)
		);
	}

	:global(.station-terminal.wterm) {
		box-sizing: border-box;
		width: 100%;
		max-width: calc(
			(var(--terminal-cell-width) * var(--terminal-cols)) + var(--terminal-padding-x)
		);
		height: calc(
			(var(--text-body) * var(--line-height-tight) * var(--terminal-rows)) +
				var(--terminal-padding-y)
		);
		max-height: calc(
			(var(--text-body) * var(--line-height-tight) * var(--terminal-rows)) +
				var(--terminal-padding-y)
		);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		box-shadow: none;
	}

	:global(.station-terminal.wterm ::selection) {
		background: color-mix(in oklch, var(--color-accent), transparent 70%);
	}
</style>
