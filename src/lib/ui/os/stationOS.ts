import { createStationVFS } from './vfs';
import { resolvePath } from './path';
import {
	ANSI,
	formatEquipmentList,
	formatJSON,
	formatOperatorInfo,
	formatQSOList,
	lines
} from './format';
import type { StationOS, StationOSAdapters, StationOSOptions } from './types';

const STATUS_LINES = [
	'Initializing RF Module ....... ',
	'Initializing Antenna ......... ',
	'Initializing Codec ........... ',
	'ALL SYSTEMS .................. '
];

function randomDelay(min: number, max: number) {
	return min + Math.random() * (max - min);
}

function parseArgs(line: string): string[] {
	const args: string[] = [];
	let current = '';
	let quote: string | null = null;

	for (const char of line.trim()) {
		if ((char === '"' || char === "'") && quote === null) {
			quote = char;
			continue;
		}

		if (char === quote) {
			quote = null;
			continue;
		}

		if (char === ' ' && quote === null) {
			if (current) {
				args.push(current);
				current = '';
			}
			continue;
		}

		current += char;
	}

	if (current) args.push(current);
	return args;
}

function authName(adapters: StationOSAdapters): string {
	const status = adapters.auth.status();
	return status.callsign ?? (status.role === 'loading' ? 'loading' : 'guest');
}

function ensureAdmin(adapters: StationOSAdapters): string | null {
	return adapters.auth.status().isAdmin ? null : 'permission denied';
}

function helpText() {
	return lines(
		`${ANSI.bold}Available commands${ANSI.reset}`,
		'help                         Show commands',
		'ls [path]                    List files',
		'cd [path]                    Change directory and navigate site routes',
		'cat <path>                   Print a file',
		'pwd                          Print working directory',
		'clear                        Clear the terminal',
		'whoami                       Print current station callsign',
		'auth status|login|logout',
		'qso list|view <id>|add|edit <id>',
		'equipment list|view <id>|add|edit <id>|activate <id>|deactivate <id>'
	);
}

export function createStationOS({
	adapters,
	siteEntries,
	staticEntries
}: StationOSOptions): StationOS {
	const vfs = createStationVFS(siteEntries, staticEntries, adapters);
	let cwd = '/';
	let bootComplete = false;
	let bootRun = 0;

	function emit(text: string) {
		adapters.emit(text);
	}

	function emitLine(text = '') {
		emit(`${text}\r\n`);
	}

	function getPrompt() {
		return `${authName(adapters)}:${cwd}$ `;
	}

	function emitPrompt() {
		emit(getPrompt());
	}

	function completeBoot() {
		bootComplete = true;
	}

	function emitInstantBootTranscript() {
		for (const line of STATUS_LINES) {
			emitLine(`${line}${ANSI.green}OK${ANSI.reset}`);
		}

		emitLine(`${ANSI.bold}${ANSI.green}See you in the air.${ANSI.reset}`);
		emitLine(`${getPrompt()}cat /operator_info.json`);
		emitLine(formatOperatorInfo(adapters.station.operatorInfo()));
		emitPrompt();
	}

	async function runShell(args: string[]): Promise<void> {
		const [command, ...rest] = args;

		if (!command) return;

		if (command === 'help') {
			emitLine(helpText());
			return;
		}

		if (command === 'pwd') {
			emitLine(cwd);
			return;
		}

		if (command === 'clear') {
			emit(ANSI.clear);
			return;
		}

		if (command === 'whoami') {
			emitLine(`${ANSI.cyan}${authName(adapters)}${ANSI.reset}`);
			return;
		}

		if (command === 'ls') {
			const entries = await vfs.list(rest[0] ?? '.', cwd);
			emitLine(entries.map((entry) => entry.name).join('  '));
			return;
		}

		if (command === 'cat') {
			const target = rest[0];
			if (!target) {
				emitLine('cat: missing operand');
				return;
			}

			emitLine(await vfs.read(target, cwd));
			return;
		}

		if (command === 'cd') {
			const next = resolvePath(cwd, rest[0] ?? '/');
			if (!(await vfs.isDirectory(next))) {
				emitLine(`${next}: not a directory`);
				return;
			}

			cwd = next;
			const route = vfs.routeFor(next);
			if (route) await adapters.router.goto(route);
			return;
		}

		if (command === 'auth') {
			await runAuthApp(rest);
			return;
		}

		if (command === 'qso') {
			await runQSOApp(rest);
			return;
		}

		if (command === 'equipment') {
			await runEquipmentApp(rest);
			return;
		}

		emitLine(`${command}: command not found`);
	}

	async function runAuthApp(args: string[]) {
		const [action] = args;

		if (action === 'status') {
			emitLine(formatJSON(adapters.auth.status()));
			return;
		}

		if (action === 'login') {
			await adapters.auth.login();
			emitLine('opening /auth/login');
			return;
		}

		if (action === 'logout') {
			const status = adapters.auth.status();
			if (!status.isAuthenticated) {
				emitLine('not logged in');
				return;
			}

			await adapters.auth.logout();
			emitLine('logged out');
			return;
		}

		emitLine('usage: auth status|login|logout');
	}

	async function runQSOApp(args: string[]) {
		const [action, id] = args;

		if (action === 'list') {
			const result = await adapters.qso.list();
			emitLine(formatQSOList(result.data, result.total));
			return;
		}

		if (action === 'view') {
			if (!id) {
				emitLine('usage: qso view <id>');
				return;
			}

			await adapters.qso.navigateView(id);
			emitLine(`opening /qso/${id}`);
			return;
		}

		if (action === 'add') {
			const error = ensureAdmin(adapters);
			if (error) {
				emitLine(error);
				return;
			}

			await adapters.qso.navigateAdd();
			emitLine('opening /qso/new');
			return;
		}

		if (action === 'edit') {
			const error = ensureAdmin(adapters);
			if (error) {
				emitLine(error);
				return;
			}

			if (!id) {
				emitLine('usage: qso edit <id>');
				return;
			}

			await adapters.qso.navigateEdit(id);
			emitLine(`opening /qso/${id}/edit`);
			return;
		}

		emitLine('usage: qso list|view <id>|add|edit <id>');
	}

	async function runEquipmentApp(args: string[]) {
		const [action, id] = args;

		if (action === 'list') {
			emitLine(formatEquipmentList(await adapters.equipment.list()));
			return;
		}

		if (action === 'view') {
			if (!id) {
				emitLine('usage: equipment view <id>');
				return;
			}

			await adapters.equipment.navigateView(id);
			emitLine(`opening /equipment/${id}`);
			return;
		}

		if (action === 'add') {
			const error = ensureAdmin(adapters);
			if (error) {
				emitLine(error);
				return;
			}

			await adapters.equipment.navigateAdd();
			emitLine('opening /equipment/new');
			return;
		}

		if (action === 'edit') {
			const error = ensureAdmin(adapters);
			if (error) {
				emitLine(error);
				return;
			}

			if (!id) {
				emitLine('usage: equipment edit <id>');
				return;
			}

			await adapters.equipment.navigateEdit(id);
			emitLine(`opening /equipment/${id}`);
			return;
		}

		if (action === 'activate' || action === 'deactivate') {
			const error = ensureAdmin(adapters);
			if (error) {
				emitLine(error);
				return;
			}

			if (!id) {
				emitLine(`usage: equipment ${action} <id>`);
				return;
			}

			const item =
				action === 'activate'
					? await adapters.equipment.activate(id)
					: await adapters.equipment.deactivate(id);
			emitLine(`${item.name}: ${item.is_active ? 'active' : 'inactive'}`);
			return;
		}

		emitLine('usage: equipment list|view <id>|add|edit <id>|activate <id>|deactivate <id>');
	}

	return {
		async boot(options = {}) {
			bootRun += 1;
			const runId = bootRun;
			bootComplete = false;
			cwd = '/';

			if (options.instant) {
				emitInstantBootTranscript();
				completeBoot();
				return;
			}

			for (const line of STATUS_LINES) {
				if (runId !== bootRun) return;
				emit(line);
				await adapters.sleep(randomDelay(360, 760));
				if (runId !== bootRun) return;
				emitLine(`${ANSI.green}OK${ANSI.reset}`);
				await adapters.sleep(randomDelay(260, 520));
			}

			await adapters.sleep(420);
			if (runId !== bootRun) return;
			emitLine(`${ANSI.bold}${ANSI.green}See you in the air.${ANSI.reset}`);

			await adapters.sleep(900);
			if (runId !== bootRun) return;
			emitPrompt();
			await adapters.sleep(500);
			if (runId !== bootRun) return;
			emitLine('cat /operator_info.json');

			await adapters.sleep(620);
			if (runId !== bootRun) return;
			emitLine(formatOperatorInfo(adapters.station.operatorInfo()));

			await adapters.sleep(620);
			if (runId !== bootRun) return;
			completeBoot();
			emitPrompt();
		},

		skipBoot() {
			if (bootComplete) return;
			bootRun += 1;
			emit(ANSI.clear);
			emitInstantBootTranscript();
			completeBoot();
		},

		async exec(line: string) {
			if (!bootComplete) return;

			try {
				await runShell(parseArgs(line));
			} catch (error) {
				emitLine(error instanceof Error ? error.message : 'Unknown error');
			}

			emitPrompt();
		},

		getPrompt,

		getState() {
			return { cwd, bootComplete };
		}
	};
}
