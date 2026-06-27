import type { StationOS } from '$lib/ui/os';

type Emit = (data: string) => void;

export interface TerminalSession {
	start(options?: { instant?: boolean }): Promise<void>;
	input(data: string): void;
	skip(): void;
	dispose(): void;
}

export function createBrowserTerminalSession(
	os: StationOS,
	emit: Emit,
	onBootComplete: () => void = () => {}
): TerminalSession {
	let disposed = false;
	let lineBuffer = '';
	let completionNotified = false;

	function completeBoot() {
		if (completionNotified || !os.getState().bootComplete) return;
		completionNotified = true;
		onBootComplete();
	}

	async function handleTab() {
		if (!lineBuffer) return;

		const result = await os.complete(lineBuffer);
		if (disposed) return;

		if (result.candidates.length > 0) {
			emit('\r\n');
			emit(result.candidates.join('  '));
			emit('\r\n');
			emit(os.getPrompt());
			emit(lineBuffer);
			return;
		}

		if (result.completedLine !== lineBuffer || result.suffix) {
			const newBuffer = `${result.completedLine}${result.suffix}`;
			emit(newBuffer.slice(lineBuffer.length));
			lineBuffer = newBuffer;
		}
	}

	return {
		async start(options = {}) {
			lineBuffer = '';
			completionNotified = false;
			await os.boot(options);
			if (!disposed) {
				completeBoot();
			}
		},

		input(data: string) {
			if (!os.getState().bootComplete || disposed) return;

			for (const char of data) {
				if (char === '\r' || char === '\n') {
					emit('\r\n');
					const command = lineBuffer;
					lineBuffer = '';
					void os.exec(command);
					continue;
				}

				if (char === '\u0003') {
					emit('^C\r\n');
					lineBuffer = '';
					emit(os.getPrompt());
					continue;
				}

				if (char === '\u007f' || char === '\b') {
					if (lineBuffer.length === 0) continue;
					lineBuffer = lineBuffer.slice(0, -1);
					emit('\b \b');
					continue;
				}

				if (char === '\t') {
					void handleTab();
					continue;
				}

				if (char >= ' ') {
					lineBuffer += char;
					emit(char);
				}
			}
		},

		skip() {
			if (os.getState().bootComplete || disposed) return;
			lineBuffer = '';
			os.skipBoot();
			completeBoot();
		},

		dispose() {
			disposed = true;
		}
	};
}
