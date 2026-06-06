<script lang="ts">
	import { onMount } from 'svelte';
	import operatorData from '$lib/logic/config/operator.json';

	let { skipSignal = 0, oncomplete = () => {} }: { skipSignal?: number; oncomplete?: () => void } =
		$props();

	type LineType = 'status' | 'muted' | 'spacer' | 'command' | 'comment' | 'json' | 'bracket';

	interface Line {
		type: LineType;
		text: string;
		suffix?: string;
		jsonValue?: string;
	}

	interface RenderedLine {
		line: Line;
		text: string;
		suffixVisible: boolean;
		cursorVisible: boolean;
	}

	const statusLines: Line[] = [
		{ type: 'status', text: 'Initializing RF Module ....... ', suffix: 'OK' },
		{ type: 'status', text: 'Initializing Antenna ......... ', suffix: 'OK' },
		{ type: 'status', text: 'Initializing Codec ........... ', suffix: 'OK' },
		{ type: 'status', text: 'ALL SYSTEMS .................. ', suffix: 'OK' }
	];

	const commandLine: Line = { type: 'command', text: '$ cat operator_info.json' };
	const outputHeaderLines: Line[] = [
		{ type: 'comment', text: '// operator_info.json' },
		{ type: 'comment', text: '// Version: 1' },
		{ type: 'comment', text: '// Created: 2026-05-20' },
		{ type: 'comment', text: '// Updated: 2026-05-22' },
		{ type: 'bracket', text: '{' }
	];
	const messageLine: Line = { type: 'muted', text: 'See you in the air.' };

	const jsonEntries = Object.entries(operatorData);
	const jsonLines: Line[] = jsonEntries.map(([key, value], index) => ({
		type: 'json' as LineType,
		text: `  "${key}": "${value}"`,
		suffix: index < jsonEntries.length - 1 ? ',' : '',
		jsonValue: value
	}));

	const closingLine: Line = { type: 'bracket', text: '}' };
	const promptLine: Line = { type: 'command', text: '$ ' };

	const allLines: Line[] = [
		...statusLines,
		messageLine,
		commandLine,
		...outputHeaderLines,
		...jsonLines,
		closingLine,
		promptLine
	];
	const STATUS_CHECK_DELAY = { min: 360, max: 760 };
	const STATUS_LINE_GAP = { min: 260, max: 520 };
	const COMMAND_TYPE_DELAY = { min: 28, max: 82 };
	const CAT_OUTPUT_DELAY = { min: 8, max: 20 };

	let visibleLines = $state<RenderedLine[]>([]);
	let isComplete = $state(false);
	let isSkipped = $state(false);
	let timers: ReturnType<typeof setTimeout>[] = [];
	let reducedMotion = $state(false);
	let lastSkipSignal = $state(0);
	let completionNotified = $state(false);
	let playId = 0;

	function clearAllTimers() {
		timers.forEach(clearTimeout);
		timers = [];
	}

	function skip() {
		if (isComplete || isSkipped) return;
		isSkipped = true;
		playId += 1;
		clearAllTimers();
		visibleLines = allLines.map((line, index) => ({
			line,
			text: line.text,
			suffixVisible: true,
			cursorVisible: index === allLines.length - 1
		}));
		isComplete = true;
	}

	function randomDelay(min: number, max: number) {
		return min + Math.random() * (max - min);
	}

	function wait(ms: number) {
		return new Promise<void>((resolve) => {
			const timer = setTimeout(resolve, ms);
			timers.push(timer);
		});
	}

	function addLine(line: Line, text = line.text, suffixVisible = true) {
		visibleLines = [
			...visibleLines.map((renderedLine) => ({ ...renderedLine, cursorVisible: false })),
			{ line, text, suffixVisible, cursorVisible: true }
		];
	}

	function updateLastLine(text: string, suffixVisible: boolean) {
		visibleLines = visibleLines.map((renderedLine, index) =>
			index === visibleLines.length - 1
				? { ...renderedLine, text, suffixVisible, cursorVisible: true }
				: { ...renderedLine, cursorVisible: false }
		);
	}

	async function playTerminal(sequenceId: number) {
		for (const line of statusLines) {
			if (sequenceId !== playId) return;
			addLine(line, line.text, false);
			await wait(randomDelay(STATUS_CHECK_DELAY.min, STATUS_CHECK_DELAY.max));
			if (sequenceId !== playId) return;
			updateLastLine(line.text, true);
			await wait(randomDelay(STATUS_LINE_GAP.min, STATUS_LINE_GAP.max));
		}

		await wait(420);
		if (sequenceId !== playId) return;
		addLine(messageLine);

		await wait(900);
		if (sequenceId !== playId) return;
		addLine(commandLine, '$ ', true);

		await wait(500);
		for (let index = 2; index < commandLine.text.length; index += 1) {
			await wait(randomDelay(COMMAND_TYPE_DELAY.min, COMMAND_TYPE_DELAY.max));
			if (sequenceId !== playId) return;
			updateLastLine(commandLine.text.slice(0, index + 1), true);
		}

		await wait(620);
		for (const line of [...outputHeaderLines, ...jsonLines, closingLine]) {
			if (sequenceId !== playId) return;
			addLine(line);
			await wait(randomDelay(CAT_OUTPUT_DELAY.min, CAT_OUTPUT_DELAY.max));
		}

		await wait(620);
		if (sequenceId !== playId) return;
		addLine(promptLine);

		await wait(120);
		if (sequenceId === playId) {
			isComplete = true;
		}
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
			visibleLines = allLines.map((line, index) => ({
				line,
				text: line.text,
				suffixVisible: true,
				cursorVisible: index === allLines.length - 1
			}));
			isComplete = true;
		} else {
			playId += 1;
			void playTerminal(playId);
		}

		document.addEventListener('keydown', handleKeydown);

		return () => {
			clearAllTimers();
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#snippet terminalCursor()}
	<span class="relative inline-block h-0 w-0 align-baseline" aria-hidden="true">
		<span
			class="animate-blink absolute bottom-[-0.12em] left-0 inline-block h-[1.2em] w-[0.6em] bg-[var(--color-text-primary)]"
			data-testid="terminal-cursor"
		></span>
	</span>
{/snippet}

{#snippet terminalLine(renderedLine: RenderedLine)}
	{@const line = renderedLine.line}
	{@const text = renderedLine.text}
	<div class="whitespace-pre">
		<span class="inline-flex items-baseline">
			{#if line.type === 'status'}
				<span>{text}</span>
				{#if !renderedLine.suffixVisible && renderedLine.cursorVisible}
					{@render terminalCursor()}
				{/if}
				<span class={renderedLine.suffixVisible ? 'text-[var(--color-accent)]' : 'invisible'}
					>{line.suffix}</span
				>
				{#if renderedLine.suffixVisible && renderedLine.cursorVisible}
					{@render terminalCursor()}
				{/if}
			{:else if line.type === 'muted'}
				<span class="font-semibold text-[var(--color-accent)]">{text}</span>
			{:else if line.type === 'command'}
				<span class="text-[var(--color-text-secondary)]">$</span>
				<span>{text.slice(1)}</span>
			{:else if line.type === 'comment'}
				<span class="text-[var(--color-text-muted)]">{text}</span>
			{:else if line.type === 'json'}
				<span>{text.split(':')[0]}:</span>
				<span class="text-[var(--color-accent)]">"{line.jsonValue}"</span>
				{#if line.suffix}
					<span>{line.suffix}</span>
				{/if}
			{:else}
				<span>{text}</span>
			{/if}
			{#if line.type !== 'status' && renderedLine.cursorVisible}
				{@render terminalCursor()}
			{/if}
		</span>
	</div>
{/snippet}

<div
	class="card-panel relative mx-auto grid max-w-[41rem] p-[var(--space-6)] select-none"
	data-testid="terminal-card"
>
	<div
		class="invisible col-start-1 row-start-1 overflow-hidden font-mono leading-[var(--line-height-tight)] whitespace-nowrap text-[var(--text-body)]"
		aria-hidden="true"
	>
		{#each allLines as line, i (i)}
			{@render terminalLine({ line, text: line.text, suffixVisible: true, cursorVisible: false })}
		{/each}
	</div>

	<div
		class="col-start-1 row-start-1 overflow-hidden font-mono leading-[var(--line-height-tight)] whitespace-nowrap text-[var(--color-text-primary)] text-[var(--text-body)]"
		data-testid="terminal-output"
		role="log"
		aria-live="polite"
	>
		{#each visibleLines as renderedLine, i (i)}
			{@render terminalLine(renderedLine)}
		{/each}
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
