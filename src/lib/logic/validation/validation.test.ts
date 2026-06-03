import { describe, expect, it } from 'vitest';
import type { QSOInsert } from '$lib/logic/types/qso';
import {
	validateBand,
	validateCallsign,
	validateGridSquare,
	validateQSO,
	validateRST
} from './index';

function createQSO(overrides: Partial<QSOInsert> = {}): QSOInsert {
	return {
		profile_id: 'profile-1',
		callsign: 'K1ABC',
		qso_date: '2026-01-15',
		time_on: '12:34:56',
		band: '20m',
		mode: 'SSB',
		rst_sent: '59',
		rst_rcvd: '57',
		is_eyeball: false,
		...overrides
	};
}

describe('QSO validation helpers', () => {
	it('validates standard callsigns and portable/mobile suffixes', () => {
		expect(validateCallsign('K1ABC')).toBe(true);
		expect(validateCallsign('JA1ABC')).toBe(true);
		expect(validateCallsign('VK2XYZ/P')).toBe(true);
		expect(validateCallsign('N0CALL/M')).toBe(true);
		expect(validateCallsign('W1AW/MM')).toBe(true);
	});

	it('rejects malformed or out-of-range callsigns', () => {
		expect(validateCallsign('K1')).toBe(false);
		expect(validateCallsign('NO-DIGIT')).toBe(false);
		expect(validateCallsign('K1ABC/QRP')).toBe(false);
		expect(validateCallsign('THISCALLSIGNISFARTOOLONG')).toBe(false);
	});

	it('validates four- and six-character Maidenhead grid squares', () => {
		expect(validateGridSquare('OM89')).toBe(true);
		expect(validateGridSquare('OM89ab')).toBe(true);
		expect(validateGridSquare('FN31pr')).toBe(true);
		expect(validateGridSquare('ZZ99')).toBe(false);
		expect(validateGridSquare('OM8999')).toBe(false);
	});

	it('validates supported bands', () => {
		expect(validateBand('20m')).toBe(true);
		expect(validateBand('70cm')).toBe(true);
		expect(validateBand('11m')).toBe(false);
	});

	it('validates phone and CW/digital RST formats', () => {
		expect(validateRST('59', 'SSB')).toBe(true);
		expect(validateRST('599', 'SSB')).toBe(true);
		expect(validateRST('69', 'SSB')).toBe(false);
		expect(validateRST('599', 'CW')).toBe(true);
		expect(validateRST('59', 'CW')).toBe(false);
		expect(validateRST('599', 'FT8')).toBe(true);
	});

	it('accepts a complete valid QSO', () => {
		expect(validateQSO(createQSO())).toEqual({ valid: true, errors: [] });
	});

	it('returns required field errors for missing core fields and missing band/frequency', () => {
		const result = validateQSO(
			createQSO({ callsign: '', qso_date: '', time_on: '', band: undefined, freq: undefined })
		);

		expect(result.valid).toBe(false);
		expect(result.errors).toEqual(
			expect.arrayContaining([
				{ field: 'callsign', code: 'REQUIRED' },
				{ field: 'qso_date', code: 'REQUIRED' },
				{ field: 'time_on', code: 'REQUIRED' },
				{ field: 'band', code: 'REQUIRED' }
			])
		);
	});

	it('returns format-specific errors for invalid optional fields', () => {
		const result = validateQSO(
			createQSO({
				callsign: 'BAD',
				qso_date: '2026-02-31',
				time_on: '24:00:00',
				band: '11m',
				mode: 'LASER',
				grid_square: 'ZZ99',
				rst_sent: '69'
			})
		);

		expect(result.valid).toBe(false);
		expect(result.errors).toEqual(
			expect.arrayContaining([
				{ field: 'callsign', code: 'INVALID_FORMAT' },
				{ field: 'qso_date', code: 'INVALID_FORMAT' },
				{ field: 'time_on', code: 'INVALID_FORMAT' },
				{ field: 'band', code: 'INVALID_BAND' },
				{ field: 'mode', code: 'INVALID_MODE' },
				{ field: 'grid_square', code: 'INVALID_GRID' },
				{ field: 'rst_sent', code: 'INVALID_RST' }
			])
		);
	});

	it('skips band and frequency requirements for eyeball QSOs', () => {
		expect(validateQSO(createQSO({ is_eyeball: true, band: undefined, freq: undefined }))).toEqual({
			valid: true,
			errors: []
		});
	});

	it('accepts frequency instead of band for non-eyeball QSOs', () => {
		expect(validateQSO(createQSO({ band: undefined, freq: 14.074 }))).toEqual({
			valid: true,
			errors: []
		});
	});
});
