import { describe, expect, it, vi } from 'vitest';
import { createStationOS } from './stationOS';
import type { AuthStatus, SiteFSEntry, StationOSAdapters } from './types';
import type { Equipment } from '$lib/logic/types/equipment';
import type { PaginatedResult, QSO } from '$lib/logic/types/qso';

const SITE_ENTRIES: SiteFSEntry[] = [
	{ path: '/', route: '/', kind: 'page', params: [] },
	{ path: '/equipment', route: '/equipment', kind: 'page', params: [] },
	{ path: '/qso', route: '/qso', kind: 'page', params: [] }
];

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

	const adapters: StationOSAdapters = {
		emit: (text) => {
			output.push(text);
		},
		sleep: vi.fn(async () => undefined),
		auth: {
			status: () => authStatus,
			login: vi.fn(async () => undefined),
			logout: vi.fn(async () => undefined)
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
		}
	};

	const os = createStationOS({ adapters, siteEntries: SITE_ENTRIES });

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
		expect(helpOutput).toContain('qso list|view <id>|add|edit <id>');

		const pwdOutput = await execAndCollect(harness.os, harness.output, 'pwd');
		expect(pwdOutput).toContain('/\r\n');
		expect(pwdOutput).toContain('guest:/$ ');

		const cdOutput = await execAndCollect(harness.os, harness.output, 'cd ./qso/../equipment');
		expect(cdOutput).toBe('guest:/equipment$ ');
		expect(harness.adapters.router.goto).toHaveBeenCalledWith('/equipment');
		expect(harness.os.getState()).toEqual({ cwd: '/equipment', bootComplete: true });

		const lsOutput = await execAndCollect(harness.os, harness.output, 'ls ../');
		expect(lsOutput).toContain('operator_info.json');
		expect(lsOutput).toContain('etc');
		expect(lsOutput).toContain('index');

		const unknownOutput = await execAndCollect(harness.os, harness.output, 'frobnicate');
		expect(unknownOutput).toContain('frobnicate: command not found');
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

	it('lazy-loads QSO and equipment entries through ls and cat', async () => {
		const harness = createHarness();
		await bootInstant(harness.os, harness.output);

		const qsoListOutput = await execAndCollect(harness.os, harness.output, 'ls /qso');
		expect(harness.qsoList).toHaveBeenCalledTimes(1);
		expect(harness.qsoGet).not.toHaveBeenCalled();
		expect(qsoListOutput).toContain('qso-1.json');

		const qsoCatOutput = await execAndCollect(harness.os, harness.output, 'cat /qso/qso-1.json');
		expect(harness.qsoList).toHaveBeenCalledTimes(1);
		expect(harness.qsoGet).toHaveBeenCalledTimes(1);
		expect(harness.qsoGet).toHaveBeenCalledWith('qso-1');
		expect(qsoCatOutput).toContain('"id": "qso-1"');
		expect(qsoCatOutput).toContain('guest:/$ ');

		const equipmentListOutput = await execAndCollect(harness.os, harness.output, 'ls /equipment');
		expect(harness.equipmentList).toHaveBeenCalledTimes(1);
		expect(harness.equipmentGet).not.toHaveBeenCalled();
		expect(equipmentListOutput).toContain('eq-1.json');

		const equipmentCatOutput = await execAndCollect(
			harness.os,
			harness.output,
			'cat /equipment/eq-1.json'
		);
		expect(harness.equipmentList).toHaveBeenCalledTimes(1);
		expect(harness.equipmentGet).toHaveBeenCalledTimes(1);
		expect(harness.equipmentGet).toHaveBeenCalledWith('eq-1');
		expect(equipmentCatOutput).toContain('"id": "eq-1"');
		expect(equipmentCatOutput).toContain('guest:/$ ');
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
