import operatorData from '$lib/logic/config/operator.json';

type Emit = (data: string) => void;
type GetCallsign = () => string;

export interface TerminalSession {
	start(options?: { instant?: boolean }): Promise<void>;
	input(data: string): void;
	skip(): void;
	dispose(): void;
}

const ESC = '\x1b[';
const ANSI = {
	reset: `${ESC}0m`,
	bold: `${ESC}1m`,
	dim: `${ESC}2m`,
	green: `${ESC}32m`,
	cyan: `${ESC}36m`,
	muted: `${ESC}90m`,
	clear: `${ESC}3J${ESC}2J${ESC}H`
};

const STATUS_LINES = [
	'Initializing RF Module ....... ',
	'Initializing Antenna ......... ',
	'Initializing Codec ........... ',
	'ALL SYSTEMS .................. '
];

const COMMAND = 'cat operator_info.json';
const PROMPT = '$ ';

function randomDelay(min: number, max: number) {
	return min + Math.random() * (max - min);
}

function createOperatorInfo() {
	const entries = Object.entries(operatorData).map(([key, value], index, values) => {
		const suffix = index < values.length - 1 ? ',' : '';
		return `  "${key}": "${value}"${suffix}`;
	});

	return [
		`${ANSI.muted}// operator_info.json${ANSI.reset}`,
		`${ANSI.muted}// Version: 1${ANSI.reset}`,
		`${ANSI.muted}// Created: 2026-05-20${ANSI.reset}`,
		`${ANSI.muted}// Updated: 2026-05-22${ANSI.reset}`,
		'{',
		...entries,
		'}'
	].join('\r\n');
}

function createBootTranscript() {
	const status = STATUS_LINES.map((line) => `${line}${ANSI.green}OK${ANSI.reset}`).join('\r\n');

	return [
		status,
		`${ANSI.bold}${ANSI.green}See you in the air.${ANSI.reset}`,
		`${PROMPT}${COMMAND}`,
		createOperatorInfo(),
		PROMPT
	].join('\r\n');
}

export function createBrowserTerminalSession(
	emit: Emit,
	getCallsign: GetCallsign,
	onBootComplete: () => void = () => {}
): TerminalSession {
	let timers: ReturnType<typeof setTimeout>[] = [];
	let bootComplete = false;
	let disposed = false;
	let lineBuffer = '';
	let bootRun = 0;

	function clearTimers() {
		timers.forEach(clearTimeout);
		timers = [];
	}

	function wait(ms: number) {
		return new Promise<void>((resolve) => {
			const timer = setTimeout(resolve, ms);
			timers.push(timer);
		});
	}

	function completeBoot() {
		if (bootComplete) return;
		bootComplete = true;
		onBootComplete();
	}

	function writePrompt() {
		emit(PROMPT);
	}

	function writeHelp() {
		emit(
			[
				`${ANSI.bold}Available commands${ANSI.reset}`,
				'help                  Show commands',
				'cat operator_info.json Print station operator profile',
				'whoami                Print current station callsign',
				'clear                 Clear the terminal'
			].join('\r\n')
		);
	}

	function runCommand(rawCommand: string) {
		const command = rawCommand.trim();

		if (command === '') {
			writePrompt();
			return;
		}

		if (command === 'help') {
			writeHelp();
			emit('\r\n');
			writePrompt();
			return;
		}

		if (command === 'cat operator_info.json') {
			emit(`${createOperatorInfo()}\r\n`);
			writePrompt();
			return;
		}

		if (command === 'whoami') {
			emit(`${ANSI.cyan}${getCallsign()}${ANSI.reset}\r\n`);
			writePrompt();
			return;
		}

		if (command === 'clear') {
			emit(ANSI.clear);
			writePrompt();
			return;
		}

		emit(`${command}: command not found\r\n`);
		writePrompt();
	}

	async function typeText(text: string, minDelay: number, maxDelay: number, runId: number) {
		for (const char of text) {
			await wait(randomDelay(minDelay, maxDelay));
			if (disposed || runId !== bootRun) return false;
			emit(char);
		}

		return true;
	}

	return {
		async start(options = {}) {
			bootRun += 1;
			const runId = bootRun;
			clearTimers();
			lineBuffer = '';
			bootComplete = false;

			if (options.instant) {
				emit(createBootTranscript());
				completeBoot();
				return;
			}

			for (const line of STATUS_LINES) {
				if (disposed || runId !== bootRun) return;
				emit(line);
				await wait(randomDelay(360, 760));
				if (disposed || runId !== bootRun) return;
				emit(`${ANSI.green}OK${ANSI.reset}\r\n`);
				await wait(randomDelay(260, 520));
			}

			await wait(420);
			if (disposed || runId !== bootRun) return;
			emit(`${ANSI.bold}${ANSI.green}See you in the air.${ANSI.reset}\r\n`);

			await wait(900);
			if (disposed || runId !== bootRun) return;
			writePrompt();

			await wait(500);
			const completedTyping = await typeText(COMMAND, 28, 82, runId);
			if (!completedTyping || disposed || runId !== bootRun) return;
			emit('\r\n');

			await wait(620);
			if (disposed || runId !== bootRun) return;
			emit(`${createOperatorInfo()}\r\n`);

			await wait(620);
			if (disposed || runId !== bootRun) return;
			writePrompt();
			completeBoot();
		},

		input(data: string) {
			if (!bootComplete || disposed) return;

			for (const char of data) {
				if (char === '\r' || char === '\n') {
					emit('\r\n');
					const command = lineBuffer;
					lineBuffer = '';
					runCommand(command);
					continue;
				}

				if (char === '\u0003') {
					emit('^C\r\n');
					lineBuffer = '';
					writePrompt();
					continue;
				}

				if (char === '\u007f' || char === '\b') {
					if (lineBuffer.length === 0) continue;
					lineBuffer = lineBuffer.slice(0, -1);
					emit('\b \b');
					continue;
				}

				if (char >= ' ') {
					lineBuffer += char;
					emit(char);
				}
			}
		},

		skip() {
			if (bootComplete || disposed) return;
			bootRun += 1;
			clearTimers();
			lineBuffer = '';
			emit(ANSI.clear);
			emit(createBootTranscript());
			completeBoot();
		},

		dispose() {
			disposed = true;
			bootRun += 1;
			clearTimers();
		}
	};
}
