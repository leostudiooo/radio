import { describe, expect, it } from 'vitest';
import {
	equipmentAlias,
	findEquipmentIdByAlias,
	findQSOIdByAlias,
	isUuidLike,
	qsoAlias
} from './alias';
import type { Equipment } from '$lib/logic/types/equipment';
import type { QSO } from '$lib/logic/types/qso';

function createQSO(overrides: Partial<QSO> = {}): QSO {
	return {
		id: '9f31ab02-1234-5678-9abc-def012345678',
		profile_id: 'profile-1',
		callsign: 'BA4VUN',
		time_on: '2026-06-24T09:18:00Z',
		time_off: '2026-06-24T09:25:00Z',
		band: '40m',
		mode: 'CW',
		rst_sent: '599',
		rst_rcvd: '599',
		country: 'China',
		grid_square: 'OM91jv',
		is_eyeball: false,
		created_at: '2026-06-24T09:18:00.000Z',
		updated_at: '2026-06-24T09:18:00.000Z',
		...overrides
	};
}

function createEquipment(overrides: Partial<Equipment> = {}): Equipment {
	return {
		id: 'a1b2c3d4-1234-5678-9abc-def012345678',
		profile_id: 'profile-1',
		name: 'FT-991A',
		type: 'transceiver',
		manufacturer: 'Yaesu',
		model: 'FT-991A',
		serial_number: 'SN123456',
		description: 'Base station rig',
		is_active: true,
		created_at: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

describe('qsoAlias', () => {
	it('builds YYYY-MM-DD_HHMMZ_CALLSIGN_BAND_MODE_uuid8.json from a UTC ISO timestamp', () => {
		const alias = qsoAlias(createQSO());
		expect(alias).toBe('2026-06-24_0918Z_ba4vun_40m_cw_9f31ab02.json');
	});

	it('lowercases callsign and strips slash suffixes', () => {
		const alias = qsoAlias(createQSO({ callsign: 'BA4VUN/P' }));
		expect(alias).toBe('2026-06-24_0918Z_ba4vun-p_40m_cw_9f31ab02.json');
	});

	it('handles +00:00 timezone designator the same as Z', () => {
		const alias = qsoAlias(createQSO({ time_on: '2026-06-24T09:18:00+00:00' }));
		expect(alias).toBe('2026-06-24_0918Z_ba4vun_40m_cw_9f31ab02.json');
	});

	it('uses first 8 chars of id, lowercased', () => {
		const alias = qsoAlias(createQSO({ id: 'ABCDEF1234-5678-9abc-def012345678' }));
		expect(alias).toBe('2026-06-24_0918Z_ba4vun_40m_cw_abcdef12.json');
	});
});

describe('equipmentAlias', () => {
	it('builds TYPE_MANUFACTURER-MODEL_uuid8.json when both manufacturer and model exist', () => {
		const alias = equipmentAlias(createEquipment());
		expect(alias).toBe('transceiver_yaesu-ft-991a_a1b2c3d4.json');
	});

	it('falls back to model only when manufacturer is missing', () => {
		const alias = equipmentAlias(
			createEquipment({ manufacturer: undefined, model: 'IC-7300', name: 'IC-7300' })
		);
		expect(alias).toBe('transceiver_ic-7300_a1b2c3d4.json');
	});

	it('falls back to name when both manufacturer and model are missing', () => {
		const alias = equipmentAlias(
			createEquipment({
				manufacturer: undefined,
				model: undefined,
				name: 'Manual Tuner',
				type: 'filter'
			})
		);
		expect(alias).toBe('filter_manual-tuner_a1b2c3d4.json');
	});

	it('lowercases manufacturer/model and collapses non-slug characters', () => {
		const alias = equipmentAlias(
			createEquipment({ manufacturer: 'Diamond Co', model: 'X 50', type: 'antenna' })
		);
		expect(alias).toBe('antenna_diamond-co-x-50_a1b2c3d4.json');
	});
});

describe('isUuidLike', () => {
	it('matches a canonical 8-4-4-4-12 UUID', () => {
		expect(isUuidLike('9f31ab02-1234-5678-9abc-def012345678')).toBe(true);
	});

	it('matches case-insensitively', () => {
		expect(isUuidLike('9F31AB02-1234-5678-9ABC-DEF012345678')).toBe(true);
	});

	it('rejects short non-UUID stems like "qso-1"', () => {
		expect(isUuidLike('qso-1')).toBe(false);
	});

	it('rejects partial UUIDs', () => {
		expect(isUuidLike('9f31ab02')).toBe(false);
	});
});

describe('findQSOIdByAlias', () => {
	it('returns the id when an alias stem matches', () => {
		const qso = createQSO();
		const stem = qsoAlias(qso).replace(/\.json$/, '');
		expect(findQSOIdByAlias([qso], stem)).toBe(qso.id);
	});

	it('returns null when no alias matches', () => {
		expect(findQSOIdByAlias([createQSO()], 'some-other-alias-stem')).toBeNull();
	});
});

describe('findEquipmentIdByAlias', () => {
	it('returns the id when an alias stem matches', () => {
		const item = createEquipment();
		const stem = equipmentAlias(item).replace(/\.json$/, '');
		expect(findEquipmentIdByAlias([item], stem)).toBe(item.id);
	});

	it('returns null when no alias matches', () => {
		expect(findEquipmentIdByAlias([createEquipment()], 'nope-stem')).toBeNull();
	});
});
