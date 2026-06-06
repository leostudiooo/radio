<script lang="ts">
	import { onMount } from 'svelte';
	import operatorData from '$lib/logic/config/operator.json';

	let {
		skipSignal = 0,
		oncomplete = () => {}
	}: { skipSignal?: number; oncomplete?: () => void } = $props();

	type LineType = 'status' | 'muted' | 'spacer' | 'command' | 'comment' | 'json' | 'bracket';

	interface Line {
		type: LineType;
		text: string;
		suffix?: string;
		jsonValue?: string;
	}

	const bootLines: Line[] = [
		{ type: 'status', text: 'Initializing RF Module .......', suffix: 'OK' },
		{ type: 'status', text: 'Initializing Antenna .........', suffix: 'OK' },
		{ type: 'status', text: 'Initializing Codec ...........', suffix: 'OK' },
		{ type: 'status', text: 'ALL SYSTEMS ..................', suffix: 'OK' },
		{ type: 'muted', text: 'See you in the air.' },
		{ type: 'spacer', text: '' },
		{ type: 'command', text: '$ cat operator_info.json' },
		{ type: 'comment', text: '// operator_info.json' },
		{ type: 'comment', text: '// Version: 1' },
		{ type: 'comment', text: '// Created: 2026-05-20' },
		{ type: 'comment', text: '// Updated: 2026-05-22' },
		{ type: 'bracket', text: '{' }
	];

	const jsonEntries = Object.entries(operatorData);
	const jsonLines: Line[] = jsonEntries.map(([key, value], index) => ({
		type: 'json' as LineType,
		text: `  "${key}": "${value}"`,
		suffix: index < jsonEntries.length - 1 ? ',' : '',
		jsonValue: value
	}));

	const closingLine: Line = { type: 'bracket', text: '}' };

	const allLines: Line[] = [...bootLines, ...jsonLines, closingLine];

	let visibleCount = $state(0);
	let isComplete = $state(false);
	let isSkipped = $state(false);
	let timers: ReturnType<typeof setTimeout>[] = [];
	let reducedMotion = $state(false);
	let lastSkipSignal = $state(0);
	let completionNotified = $state(false);

	function clearAllTimers() {
		timers.forEach(clearTimeout);
		timers = [];
	}

	function skip() {
		if (isComplete || isSkipped) return;
		isSkipped = true;
		clearAllTimers();
		visibleCount = allLines.length;
		isComplete = true;
	}

	function scheduleNextLine(index: number) {
		if (index >= allLines.length) {
			isComplete = true;
			return;
		}

		const delay = reducedMotion ? 0 : 300 + Math.random() * 200;

		const timer = setTimeout(() => {
			visibleCount = index + 1;
			if (!isSkipped) {
				scheduleNextLine(index + 1);
			}
		}, delay);

		timers.push(timer);
	}

	function handleKeydown() {
		if (!isComplete && !isSkipped) {
			skip();
		}
	}

	$effect(() => {
		if (skipSignal === lastSkipSignal) return;
		lastSkipSignal = skipSignal;
		skip();
	});

	$effect(() => {
		if (!isComplete || completionNotified) return;
		completionNotified = true;
		oncomplete();
	});

	onMount(() => {
		if (typeof window !== 'undefined') {
			reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		}

		if (reducedMotion) {
			visibleCount = allLines.length;
			isComplete = true;
		} else {
			scheduleNextLine(0);
		}

		document.addEventListener('keydown', handleKeydown);

		return () => {
			clearAllTimers();
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#snippet terminalLine(line: Line)}
	<div class="whitespace-pre">
		{#if line.type === 'status'}
			<span>{line.text}</span>
			<span class="text-[var(--color-accent)]">{line.suffix}</span>
		{:else if line.type === 'muted'}
			<span class="text-[var(--color-text-muted)]">{line.text}</span>
		{:else if line.type === 'command'}
			<span class="text-[var(--color-text-secondary)]">$</span>
			<span>{line.text.slice(2)}</span>
		{:else if line.type === 'comment'}
			<span class="text-[var(--color-text-muted)]">{line.text}</span>
		{:else if line.type === 'json'}
			<span>{line.text.split(':')[0]}:</span>
			<span class="text-[var(--color-accent)]">"{line.jsonValue}"</span>
			{#if line.suffix}
				<span>{line.suffix}</span>
			{/if}
		{:else}
			<span>{line.text}</span>
		{/if}
	</div>
{/snippet}

<div
	class="card-panel relative mx-auto grid max-w-[45rem] p-[var(--space-6)] select-none"
	data-testid="terminal-card"
>
	<div
		class="invisible col-start-1 row-start-1 overflow-hidden font-mono leading-[var(--line-height-tight)] text-[var(--text-body)] whitespace-nowrap"
		aria-hidden="true"
	>
		{#each allLines as line, i (i)}
			{@render terminalLine(line)}
		{/each}
		<span class="ml-[0.1em] inline-block h-[1.2em] w-[0.6em] align-middle"></span>
	</div>

	<div
		class="col-start-1 row-start-1 overflow-hidden font-mono leading-[var(--line-height-tight)] text-[var(--color-text-primary)] text-[var(--text-body)]"
		data-testid="terminal-output"
		role="log"
		aria-live="polite"
	>
		{#each allLines.slice(0, visibleCount) as line, i (i)}
			{@render terminalLine(line)}
		{/each}

		{#if isComplete}
			<span
				class="animate-blink ml-[0.1em] inline-block h-[1.2em] w-[0.6em] bg-[var(--color-text-primary)] align-middle"
				data-testid="terminal-cursor"
			></span>
		{/if}
	</div>
</div>

<style>
	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}

	:global(.animate-blink) {
		animation: blink 1s step-end infinite;
	}
</style>
