import { createStationVFS } from './vfs';
import { resolvePath } from './path';
import { findEquipmentIdByAlias, findQSOIdByAlias, isUuidLike } from './alias';
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
		'cd [path]                    Change directory (no navigation)',
		'open <path>                  Open a route in the browser',
		'cat <path>                   Print a file',
		'pwd                          Print working directory',
		'clear                        Clear the terminal',
		'whoami                       Print current station callsign',
		'auth status                  Print auth state as JSON',
		'auth whoami                  Print short identity',
		'auth login --passkey         Sign in with passkey',
		'auth login --magic <email>   Send magic-link email',
		'auth logout                  Sign out (no navigation)',
		'qso list                     List recent QSOs',
		'qso view <alias-or-id>       Print QSO JSON',
		'qso open <alias-or-id>       Open QSO in browser',
		'qso add                      Open new QSO form (admin)',
		'qso edit <id>                Open edit form (admin)',
		'equipment list               List equipment',
		'equipment view <alias-or-id> Print equipment JSON',
		'equipment open <alias-or-id> Open equipment in browser',
		'equipment add                Open new equipment form (admin)',
		'equipment edit <id>          Open edit form (admin)',
		'equipment activate <id>      Mark active (admin)',
		'equipment deactivate <id>    Mark inactive (admin)'
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
			return;
		}

		if (command === 'open') {
			const target = rest[0];
			if (!target) {
				emitLine('open: missing operand');
				return;
			}

			const next = resolvePath(cwd, target);
			const route = vfs.routeFor(next);
			if (!route) {
				emitLine(`open: ${next}: not a route`);
				return;
			}

			await adapters.router.goto(route);
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
		const [action, ...rest] = args;

		if (action === 'status') {
			emitLine(formatJSON(adapters.auth.status()));
			return;
		}

		if (action === 'whoami') {
			const status = adapters.auth.status();
			if (!status.isAuthenticated || !status.callsign) {
				emitLine('guest');
				return;
			}

			const role = status.isAdmin ? 'admin' : 'user';
			const email = status.email ?? '';
			emitLine(`${status.callsign} ${role} ${email}`.trim());
			return;
		}

		if (action === 'login') {
			const [flag, email] = rest;

			if (flag === '--passkey') {
				const result = await adapters.auth.loginWithPasskey();
				if (result.success) {
					emitLine(result.message ?? 'passkey authenticated');
				} else if (result.errorCode === 'passkey_not_supported') {
					emitLine('passkey not supported on this device');
				} else {
					emitLine(result.error ?? 'login failed');
				}
				return;
			}

			if (flag === '--magic') {
				if (!email) {
					emitLine('usage: auth login --magic <email>');
					return;
				}

				const result = await adapters.auth.loginWithMagicLink(email);
				if (result.success) {
					emitLine('magic link sent');
				} else {
					emitLine(result.error ?? 'login failed');
				}
				return;
			}

			emitLine('usage: auth login --passkey | --magic <email>');
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

		emitLine('usage: auth status | whoami | login --passkey | login --magic <email> | logout');
	}

	async function runQSOApp(args: string[]) {
		const [action, target] = args;

		if (action === 'list') {
			const result = await adapters.qso.list();
			emitLine(formatQSOList(result.data, result.total));
			return;
		}

		if (action === 'view') {
			if (!target) {
				emitLine('usage: qso view <alias-or-id>');
				return;
			}

			try {
				emitLine(await vfs.read(`/qso/${target}.json`, '/'));
			} catch {
				emitLine(`qso view: ${target}: no such record`);
			}
			return;
		}

		if (action === 'open') {
			if (!target) {
				emitLine('usage: qso open <alias-or-id>');
				return;
			}

			const id = isUuidLike(target)
				? target
				: findQSOIdByAlias((await adapters.qso.list()).data, target);
			if (!id) {
				emitLine(`qso open: ${target}: no such record`);
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

			if (!target) {
				emitLine('usage: qso edit <id>');
				return;
			}

			await adapters.qso.navigateEdit(target);
			emitLine(`opening /qso/${target}/edit`);
			return;
		}

		emitLine('usage: qso list | view <alias-or-id> | open <alias-or-id> | add | edit <id>');
	}

	async function runEquipmentApp(args: string[]) {
		const [action, target] = args;

		if (action === 'list') {
			emitLine(formatEquipmentList(await adapters.equipment.list()));
			return;
		}

		if (action === 'view') {
			if (!target) {
				emitLine('usage: equipment view <alias-or-id>');
				return;
			}

			try {
				emitLine(await vfs.read(`/equipment/${target}.json`, '/'));
			} catch {
				emitLine(`equipment view: ${target}: no such record`);
			}
			return;
		}

		if (action === 'open') {
			if (!target) {
				emitLine('usage: equipment open <alias-or-id>');
				return;
			}

			const id = isUuidLike(target)
				? target
				: findEquipmentIdByAlias(await adapters.equipment.list(), target);
			if (!id) {
				emitLine(`equipment open: ${target}: no such record`);
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

			if (!target) {
				emitLine('usage: equipment edit <id>');
				return;
			}

			await adapters.equipment.navigateEdit(target);
			emitLine(`opening /equipment/${target}`);
			return;
		}

		if (action === 'activate' || action === 'deactivate') {
			const error = ensureAdmin(adapters);
			if (error) {
				emitLine(error);
				return;
			}

			if (!target) {
				emitLine(`usage: equipment ${action} <id>`);
				return;
			}

			const item =
				action === 'activate'
					? await adapters.equipment.activate(target)
					: await adapters.equipment.deactivate(target);
			emitLine(`${item.name}: ${item.is_active ? 'active' : 'inactive'}`);
			return;
		}

		emitLine(
			'usage: equipment list | view <alias-or-id> | open <alias-or-id> | add | edit <id> | activate <id> | deactivate <id>'
		);
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
