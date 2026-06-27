import { describe, expect, it, vi } from 'vitest';
import { createBrowserTerminalSession } from './terminalSession';
import type { CompletionResult, StationOS, StationOSState } from '$lib/ui/os';

function createMockOS(state: StationOSState): {
	os: StationOS;
	echo: ReturnType<typeof vi.fn>;
	exec: ReturnType<typeof vi.fn>;
	complete: ReturnType<typeof vi.fn>;
} {
	const echo = vi.fn();
	const exec = vi.fn(async () => undefined);
	const complete = vi.fn(
		async (): Promise<CompletionResult> => ({ candidates: [], completedLine: '', suffix: '' })
	);

	const os: StationOS = {
		boot: vi.fn(async () => undefined),
		skipBoot: vi.fn(),
		exec,
		complete,
		echo,
		getPrompt: vi.fn(() => 'guest:/$ '),
		getState: vi.fn(() => state)
	};

	return { os, echo, exec, complete };
}

describe('createBrowserTerminalSession', () => {
	it('routes printable chars through os.echo so they reach the transcript', () => {
		const { os, echo } = createMockOS({ cwd: '/', bootComplete: true });
		const session = createBrowserTerminalSession(os);

		session.input('abc');

		expect(echo).toHaveBeenCalledTimes(3);
		expect(echo).toHaveBeenNthCalledWith(1, 'a');
		expect(echo).toHaveBeenNthCalledWith(2, 'b');
		expect(echo).toHaveBeenNthCalledWith(3, 'c');
	});

	it('echoes CRLF on Enter and dispatches the line buffer to exec', () => {
		const { os, echo, exec } = createMockOS({ cwd: '/', bootComplete: true });
		const session = createBrowserTerminalSession(os);

		session.input('help\r');

		expect(echo).toHaveBeenCalledWith('h');
		expect(echo).toHaveBeenCalledWith('e');
		expect(echo).toHaveBeenCalledWith('l');
		expect(echo).toHaveBeenCalledWith('p');
		expect(echo).toHaveBeenCalledWith('\r\n');
		expect(exec).toHaveBeenCalledWith('help');
	});

	it('Ctrl+C echoes caret-mark, resets buffer, and reprints prompt', () => {
		const { os, echo, exec } = createMockOS({ cwd: '/', bootComplete: true });
		const session = createBrowserTerminalSession(os);

		session.input('xy\u0003');

		expect(echo).toHaveBeenCalledWith('x');
		expect(echo).toHaveBeenCalledWith('y');
		expect(echo).toHaveBeenCalledWith('^C\r\n');
		expect(echo).toHaveBeenCalledWith('guest:/$ ');
		expect(exec).not.toHaveBeenCalled();
	});

	it('backspace removes the last buffered char and echoes the erase sequence', () => {
		const { os, echo } = createMockOS({ cwd: '/', bootComplete: true });
		const session = createBrowserTerminalSession(os);

		session.input('ab\u007f');

		expect(echo).toHaveBeenCalledWith('a');
		expect(echo).toHaveBeenCalledWith('b');
		expect(echo).toHaveBeenCalledWith('\b \b');
	});

	it('ignores backspace when buffer is empty', () => {
		const { os, echo } = createMockOS({ cwd: '/', bootComplete: true });
		const session = createBrowserTerminalSession(os);

		session.input('\u007f');

		expect(echo).not.toHaveBeenCalled();
	});

	it('Tab completes via os.complete and appends the suffix through echo', async () => {
		const { os, echo, complete } = createMockOS({ cwd: '/', bootComplete: true });
		complete.mockResolvedValueOnce({
			candidates: [],
			completedLine: 'help',
			suffix: ' '
		});
		const session = createBrowserTerminalSession(os);

		session.input('he');
		session.input('\t');
		await new Promise((r) => setTimeout(r, 0));

		expect(complete).toHaveBeenCalledWith('he');
		expect(echo).toHaveBeenCalledWith('lp ');
	});

	it('Tab with multiple candidates echoes candidates and reprints prompt + buffer', async () => {
		const { os, echo, complete } = createMockOS({ cwd: '/', bootComplete: true });
		complete.mockResolvedValueOnce({
			candidates: ['cat', 'cd', 'clear'],
			completedLine: 'c',
			suffix: ''
		});
		const session = createBrowserTerminalSession(os);

		session.input('c');
		session.input('\t');
		await new Promise((r) => setTimeout(r, 0));

		expect(echo).toHaveBeenCalledWith('\r\n');
		expect(echo).toHaveBeenCalledWith('cat  cd  clear');
		expect(echo).toHaveBeenCalledWith('guest:/$ ');
		expect(echo).toHaveBeenCalledWith('c');
	});

	it('does nothing before boot completes', () => {
		const { os, echo } = createMockOS({ cwd: '/', bootComplete: false });
		const session = createBrowserTerminalSession(os);

		session.input('help\r');

		expect(echo).not.toHaveBeenCalled();
	});

	it('ignores input after dispose', () => {
		const { os, echo } = createMockOS({ cwd: '/', bootComplete: true });
		const session = createBrowserTerminalSession(os);

		session.dispose();
		session.input('help');

		expect(echo).not.toHaveBeenCalled();
	});
});
