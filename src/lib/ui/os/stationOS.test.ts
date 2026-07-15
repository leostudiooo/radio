import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStationOS, resetStationOSPersistentState } from './stationOS';
import type {
	AuthCommandResult,
	AuthStatus,
	SiteFSEntry,
	StaticFSEntry,
	StationOSAdapters
} from './types';
import type { Equipment } from '$lib/logic/types/equipment';
import type { PaginatedResult, QSO } from '$lib/logic/types/qso';

const SITE_ENTRIES: SiteFSEntry[] = [
	{ path: '/', route: '/', kind: 'page', params: [] },
	{ path: '/equipment', route: '/equipment', kind: 'page', params: [] },
	{ path: '/qso', route: '/qso', kind: 'page', params: [] }
];

const STATIC_ENTRIES: StaticFSEntry[] = [{ path: '/etc/motd' }, { path: '/etc/profile' }];

function createQSO(id = 'qso-1'): QSO {
	return {
		id,
		profile_id: 'profile-1',
		callsign: 'K1ABC',
		time_on: '2026-01-15T12:34:56Z',
		time_off: '2026-01-15T12:45:00Z',
		band: '20m',
		mode: 'SSB',
		rst_sent: '59',
		rst_rcvd: '57',
		country: 'United States',
		grid_square: 'FN31',
		is_eyeball: false,
		created_at: '2026-01-15T12:34:56.000Z',
		updated_at: '2026-01-15T12:34:56.000Z'
	};
}

function createEquipment(id = 'eq-1'): Equipment {
	return {
		id,
		profile_id: 'profile-1',
		name: 'FT-991A',
		type: 'transceiver',
		manufacturer: 'Yaesu',
		model: 'FT-991A',
		serial_number: 'SN123456',
		description: 'Base station rig',
		is_active: false,
		created_at: '2026-01-01T00:00:00.000Z'
	};
}

function createHarness(initialAuth: Partial<AuthStatus> = {}) {
	const output: string[] = [];
	let authStatus: AuthStatus = {
		loading: false,
		isAuthenticated: false,
		isAdmin: false,
		role: 'guest',
		callsign: null,
		...initialAuth
	};

	const qsoRecord = createQSO();
	const equipmentRecord = createEquipment();
	const qsoList = vi.fn(
		async (): Promise<PaginatedResult<QSO>> => ({
			data: [qsoRecord],
			total: 1,
			page: 1,
			limit: 25,
			totalPages: 1
		})
	);
	const qsoGet = vi.fn(async (id: string) => (id === qsoRecord.id ? qsoRecord : null));
	const qsoNavigateList = vi.fn(async () => undefined);
	const qsoNavigateView = vi.fn(async () => undefined);
	const qsoNavigateAdd = vi.fn(async () => undefined);
	const qsoNavigateEdit = vi.fn(async () => undefined);

	const equipmentList = vi.fn(async () => [equipmentRecord]);
	const equipmentGet = vi.fn(async (id: string) =>
		id === equipmentRecord.id ? equipmentRecord : null
	);
	const equipmentActivate = vi.fn(async (id: string) =>
		id === equipmentRecord.id
			? { ...equipmentRecord, is_active: true, name: 'Linear Amp' }
			: equipmentRecord
	);
	const equipmentDeactivate = vi.fn(async (id: string) =>
		id === equipmentRecord.id ? { ...equipmentRecord, is_active: false } : equipmentRecord
	);
	const equipmentNavigateList = vi.fn(async () => undefined);
	const equipmentNavigateView = vi.fn(async () => undefined);
	const equipmentNavigateAdd = vi.fn(async () => undefined);
	const equipmentNavigateEdit = vi.fn(async () => undefined);

	const fsRead = vi.fn(async (path: string) => {
		if (path === '/etc/motd') return 'See you in the air.';
		if (path === '/etc/profile') return 'cat /etc/motd\ncat /operator_info.json';
		throw new Error(`${path}: no such file`);
	});

	const authLoginWithPasskey = vi.fn(async (): Promise<AuthCommandResult> => ({ success: true }));
	const authLoginWithMagicLink = vi.fn(async (): Promise<AuthCommandResult> => ({ success: true }));
	const authLogout = vi.fn(async () => undefined);

	const adapters: StationOSAdapters = {
		emit: (text) => {
			output.push(text);
		},
		sleep: vi.fn(async () => undefined),
		auth: {
			status: () => authStatus,
			loginWithPasskey: authLoginWithPasskey,
			loginWithMagicLink: authLoginWithMagicLink,
			logout: authLogout
		},
		router: {
			goto: vi.fn(async () => undefined)
		},
		qso: {
			list: qsoList,
			get: qsoGet,
			navigateList: qsoNavigateList,
			navigateView: qsoNavigateView,
			navigateAdd: qsoNavigateAdd,
			navigateEdit: qsoNavigateEdit
		},
		equipment: {
			list: equipmentList,
			get: equipmentGet,
			activate: equipmentActivate,
			deactivate: equipmentDeactivate,
			navigateList: equipmentNavigateList,
			navigateView: equipmentNavigateView,
			navigateAdd: equipmentNavigateAdd,
			navigateEdit: equipmentNavigateEdit
		},
		station: {
			operatorInfo: vi.fn(() => ({
				callsign: 'BA4VUN',
				operator: 'Station OS',
				qth: 'Shanghai'
			}))
		},
		fs: {
			read: fsRead
		}
	};

	const os = createStationOS({
		adapters,
		siteEntries: SITE_ENTRIES,
		staticEntries: STATIC_ENTRIES
	});

	return {
		os,
		adapters,
		output,
		qsoRecord,
		equipmentRecord,
		qsoList,
		qsoGet,
		qsoNavigateAdd,
		equipmentList,
		equipmentGet,
		equipmentActivate,
		fsRead,
		authLoginWithPasskey,
		authLoginWithMagicLink,
		authLogout,
		authStatusRef: {
			get value() {
				return authStatus;
			},
			set value(next: AuthStatus) {
				authStatus = next;
			}
		}
	};
}

async function bootInstant(os: ReturnType<typeof createHarness>['os'], output: string[]) {
	output.length = 0;
	await os.boot({ instant: true });
	return output.join('');
}

async function execAndCollect(
	os: ReturnType<typeof createHarness>['os'],
	output: string[],
	line: string
) {
	output.length = 0;
	await os.exec(line);
	return output.join('');
}

describe('Station OS core', () => {
	it('renders the instant boot transcript with syscheck, MOTD, operator JSON, and prompt', async () => {
		const harness = createHarness();
		const transcript = await bootInstant(harness.os, harness.output);

		expect(transcript).toContain('Initializing RF Module');
		expect(transcript).toContain('ALL SYSTEMS');
		expect(transcript).toContain('See you in the air.');
		expect(transcript).toContain('cat /operator_info.json');
		expect(transcript).toContain('// operator_info.json');
		expect(transcript).toContain('"callsign": "BA4VUN"');
		expect(transcript).toContain('guest:/$ ');
	});

	it('handles help, pwd, ls, cd, path normalization, and unknown commands', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const helpOutput = await execAndCollect(harness.os, harness.output, 'help');
		expect(helpOutput).toContain('Available commands');
		expect(helpOutput).toContain('qso view <alias-or-id>');
		expect(helpOutput).toContain('open <path>');

		const pwdOutput = await execAndCollect(harness.os, harness.output, 'pwd');
		expect(pwdOutput).toContain('/\r\n');
		expect(pwdOutput).toContain('guest:/$ ');

		const cdOutput = await execAndCollect(harness.os, harness.output, 'cd ./qso/../equipment');
		expect(cdOutput).toBe('guest:/equipment$ ');
		expect(harness.adapters.router.goto).not.toHaveBeenCalled();
		expect(harness.os.getState()).toEqual({ cwd: '/equipment', bootComplete: true });

		const lsOutput = await execAndCollect(harness.os, harness.output, 'ls ../');
		expect(lsOutput).toContain('operator_info.json');
		expect(lsOutput).toContain('etc');
		expect(lsOutput).toContain('dev');

		const unknownOutput = await execAndCollect(harness.os, harness.output, 'frobnicate');
		expect(unknownOutput).toContain('frobnicate: command not found');
	});

	it('lists static files in /etc directory', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const lsOutput = await execAndCollect(harness.os, harness.output, 'ls /etc');
		expect(lsOutput).toContain('motd');
		expect(lsOutput).toContain('profile');
	});

	it('reads static files via cat with lazy fs adapter', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const motdOutput = await execAndCollect(harness.os, harness.output, 'cat /etc/motd');
		expect(harness.fsRead).toHaveBeenCalledTimes(1);
		expect(harness.fsRead).toHaveBeenCalledWith('/etc/motd');
		expect(motdOutput).toContain('See you in the air.');

		const profileOutput = await execAndCollect(harness.os, harness.output, 'cat /etc/profile');
		expect(harness.fsRead).toHaveBeenCalledTimes(2);
		expect(harness.fsRead).toHaveBeenCalledWith('/etc/profile');
		expect(profileOutput).toContain('cat /etc/motd');
		expect(profileOutput).toContain('cat /operator_info.json');
	});

	it('supports cd into static directories and path normalization', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const cdOutput = await execAndCollect(harness.os, harness.output, 'cd /etc');
		expect(cdOutput).toContain('guest:/etc$ ');
		expect(harness.os.getState().cwd).toBe('/etc');

		const pwdOutput = await execAndCollect(harness.os, harness.output, 'pwd');
		expect(pwdOutput).toContain('/etc\r\n');

		const catOutput = await execAndCollect(harness.os, harness.output, 'cat ../etc/motd');
		expect(catOutput).toContain('See you in the air.');
		expect(harness.fsRead).toHaveBeenCalledWith('/etc/motd');
	});

	it('rejects cd into static files', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const cdOutput = await execAndCollect(harness.os, harness.output, 'cd /etc/motd');
		expect(cdOutput).toContain('not a directory');
	});

	it('cat /operator_info.json prints the formatted operator profile', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const catOutput = await execAndCollect(harness.os, harness.output, 'cat /operator_info.json');
		expect(catOutput).toContain('// operator_info.json');
		expect(catOutput).toContain('"callsign": "BA4VUN"');
		expect(catOutput).toContain('"operator": "Station OS"');
		expect(catOutput).toContain('guest:/$ ');
	});

	it('cat on operator info still uses formatted profile output', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const catOutput = await execAndCollect(harness.os, harness.output, 'cat /operator_info.json');
		expect(catOutput).toContain('// operator_info.json');
		expect(catOutput).toContain('"callsign": "BA4VUN"');
	});

	it('lazy-loads QSO and equipment entries through ls and cat (alias filenames)', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const qsoAliasName = '2026-01-15_1234Z_k1abc_20m_ssb_qso-1';
		const qsoListOutput = await execAndCollect(harness.os, harness.output, 'ls /qso');
		expect(harness.qsoList).toHaveBeenCalledTimes(1);
		expect(harness.qsoGet).not.toHaveBeenCalled();
		expect(qsoListOutput).toContain(qsoAliasName);

		const qsoCatOutput = await execAndCollect(
			harness.os,
			harness.output,
			`cat /qso/${qsoAliasName}`
		);
		expect(harness.qsoGet).toHaveBeenCalledTimes(1);
		expect(harness.qsoGet).toHaveBeenCalledWith('qso-1');
		expect(qsoCatOutput).toContain('"id": "qso-1"');
		expect(qsoCatOutput).toContain('guest:/$ ');

		const equipmentAliasName = 'transceiver_yaesu-ft-991a_eq-1';
		const equipmentListOutput = await execAndCollect(harness.os, harness.output, 'ls /equipment');
		expect(harness.equipmentList).toHaveBeenCalledTimes(1);
		expect(harness.equipmentGet).not.toHaveBeenCalled();
		expect(equipmentListOutput).toContain(equipmentAliasName);

		const equipmentCatOutput = await execAndCollect(
			harness.os,
			harness.output,
			`cat /equipment/${equipmentAliasName}`
		);
		expect(harness.equipmentGet).toHaveBeenCalledTimes(1);
		expect(harness.equipmentGet).toHaveBeenCalledWith('eq-1');
		expect(equipmentCatOutput).toContain('"id": "eq-1"');
		expect(equipmentCatOutput).toContain('guest:/$ ');
	});

	it('exposes /dev as an alias of /equipment', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const lsOutput = await execAndCollect(harness.os, harness.output, 'ls /dev');
		expect(harness.equipmentList).toHaveBeenCalledTimes(1);
		expect(lsOutput).toContain('transceiver_yaesu-ft-991a_eq-1');

		const catOutput = await execAndCollect(
			harness.os,
			harness.output,
			'cat /dev/transceiver_yaesu-ft-991a_eq-1'
		);
		expect(harness.equipmentGet).toHaveBeenCalledWith('eq-1');
		expect(catOutput).toContain('"id": "eq-1"');
	});

	it('falls back to raw UUID stems when cat target is a canonical UUID', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const uuid = '9f31ab02-1234-5678-9abc-def012345678';
		harness.qsoGet.mockImplementationOnce(async (id: string) =>
			id === uuid
				? {
						...createQSO(uuid),
						callsign: 'JA1ABC',
						band: '20m',
						mode: 'FT8'
					}
				: null
		);

		const out = await execAndCollect(harness.os, harness.output, `cat /qso/${uuid}`);
		expect(harness.qsoList).not.toHaveBeenCalled();
		expect(harness.qsoGet).toHaveBeenCalledWith(uuid);
		expect(out).toContain(`"id": "${uuid}"`);
	});

	it('cat on a directory reports "is a directory"', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'cat /qso');
		expect(out).toContain('is a directory');
	});

	it('denies guest and user write commands, but lets admin activate equipment', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const guestQSOAdd = await execAndCollect(harness.os, harness.output, 'qso add');
		expect(guestQSOAdd).toContain('permission denied');
		expect(harness.qsoNavigateAdd).not.toHaveBeenCalled();

		const guestActivate = await execAndCollect(
			harness.os,
			harness.output,
			'equipment activate eq-1'
		);
		expect(guestActivate).toContain('permission denied');
		expect(harness.equipmentActivate).not.toHaveBeenCalled();

		harness.authStatusRef.value = {
			loading: false,
			isAuthenticated: true,
			isAdmin: false,
			role: 'user',
			callsign: 'K1ABC'
		};

		const userQSOAdd = await execAndCollect(harness.os, harness.output, 'qso add');
		expect(userQSOAdd).toContain('permission denied');
		expect(harness.qsoNavigateAdd).not.toHaveBeenCalled();

		harness.authStatusRef.value = {
			loading: false,
			isAuthenticated: true,
			isAdmin: true,
			role: 'admin',
			callsign: 'BA4VUN'
		};

		const adminActivate = await execAndCollect(
			harness.os,
			harness.output,
			'equipment activate eq-1'
		);
		expect(harness.equipmentActivate).toHaveBeenCalledTimes(1);
		expect(harness.equipmentActivate).toHaveBeenCalledWith('eq-1');
		expect(adminActivate).toContain('Linear Amp: active');
		expect(adminActivate).toContain('BA4VUN:/$ ');
	});
});

describe('Station OS auth app', () => {
	it('auth status prints structured JSON with role and callsign', async () => {
		const harness = createHarness({
			isAuthenticated: true,
			isAdmin: true,
			role: 'admin',
			callsign: 'BA4VUN',
			email: 'op@example.com',
			userId: 'user-1'
		});
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth status');
		expect(out).toContain('"isAuthenticated": true');
		expect(out).toContain('"isAdmin": true');
		expect(out).toContain('"role": "admin"');
		expect(out).toContain('"callsign": "BA4VUN"');
		expect(out).toContain('"email": "op@example.com"');
	});

	it('auth whoami prints "guest" when unauthenticated', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth whoami');
		expect(out).toContain('guest\r\n');
	});

	it('auth whoami prints "<callsign> admin <email>" for admin', async () => {
		const harness = createHarness({
			isAuthenticated: true,
			isAdmin: true,
			role: 'admin',
			callsign: 'BA4VUN',
			email: 'op@example.com'
		});
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth whoami');
		expect(out).toContain('BA4VUN admin op@example.com\r\n');
	});

	it('auth whoami prints "<callsign> user <email>" for non-admin authenticated', async () => {
		const harness = createHarness({
			isAuthenticated: true,
			isAdmin: false,
			role: 'user',
			callsign: 'K1ABC',
			email: 'k1abc@example.com'
		});
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth whoami');
		expect(out).toContain('K1ABC user k1abc@example.com\r\n');
	});

	it('auth login --passkey calls adapter and prints success on success', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		harness.authLoginWithPasskey.mockResolvedValueOnce({ success: true });

		const out = await execAndCollect(harness.os, harness.output, 'auth login --passkey');
		expect(harness.authLoginWithPasskey).toHaveBeenCalledTimes(1);
		expect(out).toContain('passkey authenticated\r\n');
	});

	it('auth login --passkey prints friendly message when passkey_not_supported', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		harness.authLoginWithPasskey.mockResolvedValueOnce({
			success: false,
			errorCode: 'passkey_not_supported'
		});

		const out = await execAndCollect(harness.os, harness.output, 'auth login --passkey');
		expect(out).toContain('passkey not supported on this device\r\n');
	});

	it('auth login --passkey prints underlying error on other failure', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		harness.authLoginWithPasskey.mockResolvedValueOnce({
			success: false,
			error: 'network down'
		});

		const out = await execAndCollect(harness.os, harness.output, 'auth login --passkey');
		expect(out).toContain('network down\r\n');
	});

	it('auth login --magic <email> calls adapter with email and prints "magic link sent"', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(
			harness.os,
			harness.output,
			'auth login --magic op@example.com'
		);
		expect(harness.authLoginWithMagicLink).toHaveBeenCalledWith('op@example.com');
		expect(out).toContain('magic link sent\r\n');
	});

	it('auth login --magic without email prints usage and does not call adapter', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth login --magic');
		expect(harness.authLoginWithMagicLink).not.toHaveBeenCalled();
		expect(out).toContain('usage: auth login --magic <email>');
	});

	it('auth login with no flag prints usage and does not call any login adapter', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth login');
		expect(harness.authLoginWithPasskey).not.toHaveBeenCalled();
		expect(harness.authLoginWithMagicLink).not.toHaveBeenCalled();
		expect(out).toContain('usage: auth login --passkey | --magic <email>');
	});

	it('auth login with unknown flag prints usage and does not call any login adapter', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth login --github');
		expect(harness.authLoginWithPasskey).not.toHaveBeenCalled();
		expect(harness.authLoginWithMagicLink).not.toHaveBeenCalled();
		expect(out).toContain('usage: auth login --passkey | --magic <email>');
	});

	it('auth logout when unauthenticated prints "not logged in" and does not call adapter', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth logout');
		expect(harness.authLogout).not.toHaveBeenCalled();
		expect(out).toContain('not logged in\r\n');
	});

	it('auth logout when authenticated calls adapter and prints "logged out" without navigating', async () => {
		const harness = createHarness({
			isAuthenticated: true,
			isAdmin: true,
			role: 'admin',
			callsign: 'BA4VUN'
		});
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth logout');
		expect(harness.authLogout).toHaveBeenCalledTimes(1);
		expect(harness.adapters.router.goto).not.toHaveBeenCalled();
		expect(out).toContain('logged out\r\n');
	});

	it('auth with no subcommand prints top-level usage', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'auth');
		expect(out).toContain('usage: auth status');
		expect(out).toContain('login --passkey');
		expect(out).toContain('login --magic <email>');
	});
});

describe('Station OS non-navigation mode', () => {
	const QSO_ALIAS = '2026-01-15_1234Z_k1abc_20m_ssb_qso-1';
	const EQUIPMENT_ALIAS = 'transceiver_yaesu-ft-991a_eq-1';

	it('cd into a route does not navigate, only changes cwd', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		await execAndCollect(harness.os, harness.output, 'cd /qso');
		expect(harness.os.getState().cwd).toBe('/qso');
		expect(harness.adapters.router.goto).not.toHaveBeenCalled();
	});

	it('open <route-path> navigates via router.goto', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		await execAndCollect(harness.os, harness.output, 'open /qso');
		expect(harness.adapters.router.goto).toHaveBeenCalledWith('/qso');
	});

	it('open from a cwd resolves relative paths', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);
		await execAndCollect(harness.os, harness.output, 'cd /qso');

		await execAndCollect(harness.os, harness.output, 'open ../equipment');
		expect(harness.adapters.router.goto).toHaveBeenCalledWith('/equipment');
	});

	it('open on a non-route path prints "not a route" and does not navigate', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'open /etc/motd');
		expect(out).toContain('not a route');
		expect(harness.adapters.router.goto).not.toHaveBeenCalled();
	});

	it('open with no argument prints "missing operand"', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'open');
		expect(out).toContain('open: missing operand');
	});

	it('qso view <alias> prints the record JSON and does not navigate', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, `qso view ${QSO_ALIAS}`);
		expect(harness.adapters.qso.navigateView).not.toHaveBeenCalled();
		expect(harness.qsoGet).toHaveBeenCalledWith('qso-1');
		expect(out).toContain('"id": "qso-1"');
	});

	it('qso view <missing> prints "no such record" and does not navigate', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'qso view nonexistent-stem');
		expect(harness.adapters.qso.navigateView).not.toHaveBeenCalled();
		expect(out).toContain('qso view: nonexistent-stem: no such record');
	});

	it('qso view with no argument prints usage', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'qso view');
		expect(out).toContain('usage: qso view <alias-or-id>');
	});

	it('qso open <alias> resolves to id and calls navigateView', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, `qso open ${QSO_ALIAS}`);
		expect(harness.adapters.qso.navigateView).toHaveBeenCalledWith('qso-1');
		expect(out).toContain('opening /qso/qso-1');
	});

	it('qso open <uuid> skips alias lookup and goes straight to navigateView', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const uuid = '9f31ab02-1234-5678-9abc-def012345678';
		const out = await execAndCollect(harness.os, harness.output, `qso open ${uuid}`);
		expect(harness.qsoList).not.toHaveBeenCalled();
		expect(harness.adapters.qso.navigateView).toHaveBeenCalledWith(uuid);
		expect(out).toContain(`opening /qso/${uuid}`);
	});

	it('qso open <missing> prints "no such record"', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'qso open no-such-stem');
		expect(harness.adapters.qso.navigateView).not.toHaveBeenCalled();
		expect(out).toContain('qso open: no-such-stem: no such record');
	});

	it('qso cfm <code> opens the normalized confirmation page', async () => {
		const harness = createHarness();
		await harness.os.boot({ instant: true });

		const out = await execAndCollect(harness.os, harness.output, 'qso cfm rstvwxyz');

		expect(harness.adapters.router.goto).toHaveBeenCalledWith('/qso/confirm/RSTV-WXYZ');
		expect(out).toContain('opening /qso/confirm/RSTV-WXYZ');
	});

	it('qso cfm rejects malformed verification codes', async () => {
		const harness = createHarness();
		await harness.os.boot({ instant: true });

		const out = await execAndCollect(harness.os, harness.output, 'qso cfm not-a-code');

		expect(harness.adapters.router.goto).not.toHaveBeenCalled();
		expect(out).toContain('invalid verification code');
	});

	it('equipment view <alias> prints the record JSON and does not navigate', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(
			harness.os,
			harness.output,
			`equipment view ${EQUIPMENT_ALIAS}`
		);
		expect(harness.adapters.equipment.navigateView).not.toHaveBeenCalled();
		expect(harness.equipmentGet).toHaveBeenCalledWith('eq-1');
		expect(out).toContain('"id": "eq-1"');
	});

	it('equipment open <alias> resolves to id and calls navigateView', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(
			harness.os,
			harness.output,
			`equipment open ${EQUIPMENT_ALIAS}`
		);
		expect(harness.adapters.equipment.navigateView).toHaveBeenCalledWith('eq-1');
		expect(out).toContain('opening /equipment/eq-1');
	});

	it('equipment open <missing> prints "no such record"', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const out = await execAndCollect(harness.os, harness.output, 'equipment open ghost');
		expect(harness.adapters.equipment.navigateView).not.toHaveBeenCalled();
		expect(out).toContain('equipment open: ghost: no such record');
	});
});

describe('Station OS Tab completion', () => {
	it('completes a unique command prefix with trailing space', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('he');
		expect(result).toEqual({ candidates: [], completedLine: 'help', suffix: ' ' });
	});

	it('returns all command candidates when prefix is ambiguous', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('c');
		expect(result.candidates.sort()).toEqual(['cat', 'cd', 'clear']);
		expect(result.completedLine).toBe('c');
		expect(result.suffix).toBe('');
	});

	it('returns no match when prefix matches nothing', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('xyz');
		expect(result).toEqual({ candidates: [], completedLine: 'xyz', suffix: '' });
	});

	it('completes unique auth subcommand', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('auth logo');
		expect(result).toEqual({ candidates: [], completedLine: 'auth logout', suffix: ' ' });
	});

	it('returns ambiguous auth subcommand candidates', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('auth l');
		expect(result.candidates.sort()).toEqual(['login', 'logout']);
		expect(result.completedLine).toBe('auth l');
		expect(result.suffix).toBe('');
	});

	it('completes auth login --passkey uniquely', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('auth login --p');
		expect(result).toEqual({
			candidates: [],
			completedLine: 'auth login --passkey',
			suffix: ' '
		});
	});

	it('completes qso subcommand uniquely', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('qso vie');
		expect(result).toEqual({ candidates: [], completedLine: 'qso view', suffix: ' ' });
	});

	it('completes equipment subcommand uniquely', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('equipment ac');
		expect(result).toEqual({
			candidates: [],
			completedLine: 'equipment activate',
			suffix: ' '
		});
	});

	it('completes static directory path with trailing slash', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('ls /et');
		expect(result).toEqual({ candidates: [], completedLine: 'ls /etc', suffix: '/' });
	});

	it('completes static file path with trailing space', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('cat /etc/m');
		expect(result).toEqual({ candidates: [], completedLine: 'cat /etc/motd', suffix: ' ' });
	});

	it('completes route node path with trailing slash', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('cd /q');
		expect(result).toEqual({ candidates: [], completedLine: 'cd /qso', suffix: '/' });
	});

	it('returns multiple candidates when path prefix is ambiguous', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('open /e');
		expect(result.candidates.sort()).toEqual(['equipment', 'etc']);
		expect(result.completedLine).toBe('open /e');
		expect(result.suffix).toBe('');
	});

	it('returns no match when path prefix does not exist', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('cat /nonexistent/x');
		expect(result).toEqual({ candidates: [], completedLine: 'cat /nonexistent/x', suffix: '' });
	});

	it('does not attempt completion inside arguments without known context', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const result = await harness.os.complete('pwd extra');
		expect(result).toEqual({ candidates: [], completedLine: 'pwd extra', suffix: '' });
	});

	it('completes path relative to cwd', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);
		await harness.os.exec('cd /etc');

		const result = await harness.os.complete('cat m');
		expect(result).toEqual({ candidates: [], completedLine: 'cat motd', suffix: ' ' });
	});
});

describe('Station OS persistence', () => {
	beforeEach(() => {
		resetStationOSPersistentState();
	});

	afterAll(() => {
		resetStationOSPersistentState();
	});

	it('survives cwd across createStationOS remounts', async () => {
		const baseHarness = createHarness();
		const output1: string[] = [];
		const adapters1: StationOSAdapters = {
			...baseHarness.adapters,
			emit: (text) => output1.push(text)
		};
		const os1 = createStationOS({
			adapters: adapters1,
			siteEntries: SITE_ENTRIES,
			staticEntries: STATIC_ENTRIES,
			persistent: true
		});
		await os1.boot({ instant: true });
		await os1.exec('cd /etc');

		expect(os1.getState().cwd).toBe('/etc');

		const output2: string[] = [];
		const adapters2: StationOSAdapters = {
			...baseHarness.adapters,
			emit: (text) => output2.push(text)
		};
		const os2 = createStationOS({
			adapters: adapters2,
			siteEntries: SITE_ENTRIES,
			staticEntries: STATIC_ENTRIES,
			persistent: true
		});

		expect(os2.getState().cwd).toBe('/etc');
		expect(os2.getState().bootComplete).toBe(true);

		await os2.boot();
		const replayed = output2.join('');
		expect(replayed).toContain('guest:/etc$');
	});

	it('replays transcript of previous session on next boot', async () => {
		const output1: string[] = [];
		const baseHarness = createHarness();
		const adapters1: StationOSAdapters = {
			...baseHarness.adapters,
			emit: (text) => output1.push(text)
		};
		const os1 = createStationOS({
			adapters: adapters1,
			siteEntries: SITE_ENTRIES,
			staticEntries: STATIC_ENTRIES,
			persistent: true
		});
		await os1.boot({ instant: true });
		await os1.exec('help');

		const output2: string[] = [];
		const adapters2: StationOSAdapters = {
			...baseHarness.adapters,
			emit: (text) => output2.push(text)
		};
		const os2 = createStationOS({
			adapters: adapters2,
			siteEntries: SITE_ENTRIES,
			staticEntries: STATIC_ENTRIES,
			persistent: true
		});

		await os2.boot();
		const replayed = output2.join('');
		expect(replayed).toContain('Available commands');
		expect(replayed).toContain('auth login --passkey');
	});

	it('does not share state when persistent is false', async () => {
		const harness1 = createHarness();
		await bootInstant(harness1.os, harness1.output);
		await harness1.os.exec('cd /qso');

		const harness2 = createHarness();
		await bootInstant(harness2.os, harness2.output);
		expect(harness2.os.getState().cwd).toBe('/');
	});

	it('clear wipes the transcript so next remount starts empty', async () => {
		const baseHarness = createHarness();
		const output1: string[] = [];
		const adapters1: StationOSAdapters = {
			...baseHarness.adapters,
			emit: (text) => output1.push(text)
		};
		const os1 = createStationOS({
			adapters: adapters1,
			siteEntries: SITE_ENTRIES,
			staticEntries: STATIC_ENTRIES,
			persistent: true
		});
		await os1.boot({ instant: true });
		await os1.exec('help');
		await os1.exec('clear');

		const output2: string[] = [];
		const adapters2: StationOSAdapters = {
			...baseHarness.adapters,
			emit: (text) => output2.push(text)
		};
		const os2 = createStationOS({
			adapters: adapters2,
			siteEntries: SITE_ENTRIES,
			staticEntries: STATIC_ENTRIES,
			persistent: true
		});

		await os2.boot();
		const replayed = output2.join('');
		expect(replayed).not.toContain('Available commands');
	});
});
