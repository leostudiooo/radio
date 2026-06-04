import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { QSO, QSOInsert } from '$lib/logic/types/qso';
import { ADIF_TO_DB_MAP, DB_TO_ADIF_MAP, exportADIF, parseADIF } from './index';

function fixture(name: string): string {
	return readFileSync(join(process.cwd(), 'tests', 'fixtures', name), 'utf8');
}

function asQSO(qso: QSOInsert, index = 0): QSO {
	return {
		...qso,
		id: `qso-${index}`,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z'
	};
}

function comparable(qso: QSOInsert): Omit<QSOInsert, 'profile_id'> {
	const rest: Partial<QSOInsert> = { ...qso };
	delete rest.profile_id;

	return rest as Omit<QSOInsert, 'profile_id'>;
}

describe('ADIF field mappings', () => {
	it('maps ADIF fields to database fields', () => {
		expect(ADIF_TO_DB_MAP.CALL).toBe('callsign');
		expect(ADIF_TO_DB_MAP.PROP_MODE).toBe('prop_mode');
	});

	it('maps database fields back to ADIF fields', () => {
		expect(DB_TO_ADIF_MAP.callsign).toBe('CALL');
		expect(DB_TO_ADIF_MAP.grid_square).toBe('GRIDSQUARE');
		expect(DB_TO_ADIF_MAP.longitude).toBe('LON');
	});
});

describe('parseADIF', () => {
	it('parses simple fixture records', () => {
		const qsos = parseADIF(fixture('simple.adi'));

		expect(qsos).toHaveLength(3);
		expect(qsos[0]).toMatchObject({
			callsign: 'K1ABC',
			time_on: '2026-01-01T12:30:45Z',
			band: '20m',
			mode: 'SSB',
			is_eyeball: false
		});
	});

	it('normalizes HHMM times to ISO timestamps', () => {
		const qsos = parseADIF(fixture('simple.adi'));

		expect(qsos[1]?.time_on).toBe('2026-01-02T08:15:00Z');
	});

	it('parses multimode fixture modes', () => {
		const qsos = parseADIF(fixture('multimode.adi'));

		expect(qsos.map((qso) => qso.mode)).toEqual(['SSB', 'CW', 'FT8']);
	});

	it('parses minimal fixture with required fields only', () => {
		const qsos = parseADIF(fixture('minimal.adi'));

		expect(qsos).toEqual([
			expect.objectContaining({ callsign: 'K2XYZ', time_on: '2026-03-01T09:00:00Z' }),
			expect.objectContaining({ callsign: 'G4AB', time_on: '2026-03-02T10:15:00Z' })
		]);
	});

	it('parses all supported fields from the full fixture', () => {
		const [qso] = parseADIF(fixture('full_fields.adi'));

		expect(qso).toMatchObject({
			callsign: 'BA4VUN',
			time_on: '2026-04-05T13:44:55Z',
			time_off: '2026-04-05T13:55:00Z',
			freq: 14.07425,
			tx_pwr: 50,
			dxcc: 318,
			cq_zone: 24,
			itu_zone: 44,
			ant_az: 123.4,
			ant_el: 45.6,
			distance: 9876.5,
			latitude: 31.2304,
			longitude: 121.4737
		});
	});

	it('skips unknown ADIF fields', () => {
		const qsos = parseADIF(
			'<EOH><CALL:5>K1ABC <UNKNOWN:4>skip <QSO_DATE:8>20260101 <TIME_ON:6>010203 <BAND:3>20m <EOR>'
		);

		expect(qsos[0]).toMatchObject({ callsign: 'K1ABC', time_on: '2026-01-01T01:02:03Z' });
	});

	it('skips records missing required parser fields', () => {
		const qsos = parseADIF('<EOH><CALL:5>K1ABC <BAND:3>20m <EOR>');

		expect(qsos).toEqual([]);
	});

	it('detects eyeball QSOs from PROP_MODE=EYE', () => {
		const qsos = parseADIF(fixture('eyeball.adi'));

		expect(qsos[0]).toMatchObject({ callsign: 'K3EYE', prop_mode: 'EYE', is_eyeball: true });
	});

	it('detects eyeball QSOs from custom boolean flags', () => {
		const qsos = parseADIF(fixture('eyeball.adi'));

		expect(qsos[1]).toMatchObject({ callsign: 'K4EYE', is_eyeball: true });
	});

	it('deduplicates records by callsign time_on and band', () => {
		const content =
			'<EOH><CALL:5>K1ABC <QSO_DATE:8>20260101 <TIME_ON:6>010203 <BAND:3>20m <EOR><CALL:5>K1ABC <QSO_DATE:8>20260101 <TIME_ON:6>010203 <BAND:3>20m <COMMENT:9>duplicate <EOR>';

		expect(parseADIF(content)).toHaveLength(1);
	});

	it('keeps records with same callsign and time on different bands', () => {
		const content =
			'<EOH><CALL:5>K1ABC <QSO_DATE:8>20260101 <TIME_ON:6>010203 <BAND:3>20m <EOR><CALL:5>K1ABC <QSO_DATE:8>20260101 <TIME_ON:6>010203 <BAND:3>40m <EOR>';

		expect(parseADIF(content)).toHaveLength(2);
	});

	it('throws for malformed field descriptors', () => {
		expect(() => parseADIF('<EOH><CALL>K1ABC<EOR>')).toThrow('Malformed ADIF field descriptor');
	});

	it('throws when declared length exceeds the record', () => {
		expect(() => parseADIF('<EOH><CALL:99>K1ABC<EOR>')).toThrow('declared length exceeds record');
	});
});

describe('parseADIF cross-day handling', () => {
	it('parses QSO_DATE_OFF into time_off on a different day', () => {
		const content =
			'<EOH><QSO_DATE:8>20260101<TIME_ON:4>2330<QSO_DATE_OFF:8>20260102<TIME_OFF:4>0015<CALL:6>TESTOP<BAND:3>20M<MODE:2>FT8<EOR>';

		const [qso] = parseADIF(content);

		expect(qso.time_on).toBe('2026-01-01T23:30:00Z');
		expect(qso.time_off).toBe('2026-01-02T00:15:00Z');
	});

	it('defaults time_off date to QSO_DATE when QSO_DATE_OFF is absent', () => {
		const content =
			'<EOH><QSO_DATE:8>20260101<TIME_ON:4>1200<TIME_OFF:4>1230<CALL:6>TESTOP<BAND:3>20M<MODE:2>FT8<EOR>';

		const [qso] = parseADIF(content);

		expect(qso.time_on).toBe('2026-01-01T12:00:00Z');
		expect(qso.time_off).toBe('2026-01-01T12:30:00Z');
	});
});

describe('exportADIF', () => {
	it('generates an ADIF header with program metadata', () => {
		const adif = exportADIF(parseADIF(fixture('minimal.adi')).map(asQSO));

		expect(adif).toContain('<PROGRAMID:5>radio');
		expect(adif).toContain('<EOH>');
	});

	it('exports date and time in ADIF compact formats', () => {
		const adif = exportADIF(parseADIF(fixture('simple.adi')).map(asQSO));

		expect(adif).toContain('<QSO_DATE:8>20260101');
		expect(adif).toContain('<TIME_ON:6>123045');
	});

	it('calculates field lengths for exported records', () => {
		const adif = exportADIF(parseADIF(fixture('simple.adi')).map(asQSO));

		expect(adif).toContain('<CALL:5>K1ABC');
		expect(adif).toContain('<MODE:3>SSB');
	});

	it('exports mapped full-field values', () => {
		const adif = exportADIF(parseADIF(fixture('full_fields.adi')).map(asQSO));

		expect(adif).toContain('<GRIDSQUARE:6>OM86AA');
		expect(adif).toContain('<LON:8>121.4737');
		expect(adif).toContain('<SAT_NAME:5>FO-29');
	});

	it('exports custom eyeball flag when no PROP_MODE=EYE exists', () => {
		const qso = asQSO({
			profile_id: '',
			callsign: 'K5EYE',
			time_on: '2026-05-03T14:00:00Z',
			is_eyeball: true
		});

		expect(exportADIF([qso])).toContain('<IS_EYEBALL:1>Y');
	});

	it('exports cross-day QSO with separate QSO_DATE_OFF', () => {
		const qso = asQSO({
			profile_id: '',
			callsign: 'TESTOP',
			time_on: '2026-01-01T23:30:00Z',
			time_off: '2026-01-02T00:15:00Z',
			band: '20m',
			mode: 'FT8',
			is_eyeball: false
		});

		const adif = exportADIF([qso]);

		expect(adif).toContain('<QSO_DATE:8>20260101');
		expect(adif).toContain('<TIME_ON:6>233000');
		expect(adif).toContain('<QSO_DATE_OFF:8>20260102');
		expect(adif).toContain('<TIME_OFF:6>001500');
	});

	it('round-trips parsed fixture data without data loss', () => {
		const original = [
			...parseADIF(fixture('simple.adi')),
			...parseADIF(fixture('multimode.adi')),
			...parseADIF(fixture('minimal.adi')),
			...parseADIF(fixture('full_fields.adi')),
			...parseADIF(fixture('eyeball.adi'))
		];
		const exported = exportADIF(original.map(asQSO));
		const reparsed = parseADIF(exported);

		expect(reparsed.map(comparable)).toEqual(original.map(comparable));
	});
});
