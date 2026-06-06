import type { QSOInsert } from '$lib/logic/types/qso';
import { ADIF_TO_DB_MAP } from './fields';

type MutableQSOInsert = Partial<QSOInsert>;

const NUMERIC_FIELDS = new Set<keyof QSOInsert>([
	'freq',
	'tx_pwr',
	'dxcc',
	'cq_zone',
	'itu_zone',
	'ant_az',
	'ant_el',
	'distance',
	'latitude',
	'longitude'
]);

const EYEBALL_FLAG_FIELDS = new Set(['EYE_QSO', 'IS_EYEBALL', 'EYEBALL']);

const SPECIAL_DATE_FIELDS = new Set(['QSO_DATE', 'TIME_ON', 'QSO_DATE_OFF', 'TIME_OFF']);

function bodyAfterHeader(content: string): string {
	const headerEnd = content.search(/<EOH>/i);

	if (headerEnd === -1) {
		return content;
	}

	return content.slice(headerEnd + '<EOH>'.length);
}

function normalizeDate(value: string): string {
	const trimmed = value.trim();

	if (/^\d{8}$/.test(trimmed)) {
		return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
	}

	return trimmed;
}

function normalizeTime(value: string): string {
	const trimmed = value.trim();

	if (/^\d{4}$/.test(trimmed)) {
		return `${trimmed.slice(0, 2)}:${trimmed.slice(2, 4)}:00`;
	}

	if (/^\d{6}$/.test(trimmed)) {
		return `${trimmed.slice(0, 2)}:${trimmed.slice(2, 4)}:${trimmed.slice(4, 6)}`;
	}

	return trimmed;
}

function combineDateTime(date: string, time: string): string {
	return `${date}T${time}Z`;
}

function numericValue(value: string): number | undefined {
	const parsed = Number(value.trim());

	return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanFlag(value: string): boolean {
	return ['1', 'T', 'TRUE', 'Y', 'YES'].includes(value.trim().toUpperCase());
}

function assignGenericField(
	qso: MutableQSOInsert,
	dbField: keyof QSOInsert,
	rawValue: string
): void {
	if (rawValue.length === 0) {
		return;
	}

	if (NUMERIC_FIELDS.has(dbField)) {
		const value = numericValue(rawValue);

		if (value === undefined) {
			return;
		}

		switch (dbField) {
			case 'freq':
				qso.freq = value;
				break;
			case 'tx_pwr':
				qso.tx_pwr = value;
				break;
			case 'dxcc':
				qso.dxcc = value;
				break;
			case 'cq_zone':
				qso.cq_zone = value;
				break;
			case 'itu_zone':
				qso.itu_zone = value;
				break;
			case 'ant_az':
				qso.ant_az = value;
				break;
			case 'ant_el':
				qso.ant_el = value;
				break;
			case 'distance':
				qso.distance = value;
				break;
			case 'latitude':
				qso.latitude = value;
				break;
			case 'longitude':
				qso.longitude = value;
				break;
		}

		return;
	}

	const value = rawValue.trim();

	switch (dbField) {
		case 'callsign':
			qso.callsign = value.toUpperCase();
			break;
		case 'band':
			qso.band = value.toLowerCase();
			break;
		case 'mode':
			qso.mode = value.toUpperCase();
			break;
		case 'submode':
			qso.submode = value.toUpperCase();
			break;
		case 'rst_sent':
			qso.rst_sent = value;
			break;
		case 'rst_rcvd':
			qso.rst_rcvd = value;
			break;
		case 'name':
			qso.name = value;
			break;
		case 'qth':
			qso.qth = value;
			break;
		case 'grid_square':
			qso.grid_square = value.toUpperCase();
			break;
		case 'comment':
			qso.comment = value;
			break;
		case 'country':
			qso.country = value;
			break;
		case 'cont':
			qso.cont = value.toUpperCase();
			break;
		case 'qsl_sent':
			qso.qsl_sent = value.toUpperCase();
			break;
		case 'qsl_sent_via':
			qso.qsl_sent_via = value;
			break;
		case 'qsl_rcvd':
			qso.qsl_rcvd = value.toUpperCase();
			break;
		case 'qsl_rcvd_via':
			qso.qsl_rcvd_via = value;
			break;
		case 'lotw_qsl_sent':
			qso.lotw_qsl_sent = value.toUpperCase();
			break;
		case 'lotw_qsl_rcvd':
			qso.lotw_qsl_rcvd = value.toUpperCase();
			break;
		case 'eqsl_qsl_sent':
			qso.eqsl_qsl_sent = value.toUpperCase();
			break;
		case 'eqsl_qsl_rcvd':
			qso.eqsl_qsl_rcvd = value.toUpperCase();
			break;
		case 'prop_mode':
			qso.prop_mode = value.toUpperCase();
			break;
		case 'sat_name':
			qso.sat_name = value;
			break;
		case 'operator':
			qso.operator = value.toUpperCase();
			break;
	}
}

function duplicateKey(qso: QSOInsert): string {
	return [qso.callsign, qso.time_on, qso.band ?? ''].join('\u0000');
}

function hasRequiredFields(qso: MutableQSOInsert): qso is QSOInsert {
	return Boolean(qso.callsign && qso.time_on);
}

function parseRecord(record: string): QSOInsert | undefined {
	const qso: MutableQSOInsert = { profile_id: '', is_eyeball: false };
	let offset = 0;
	let pendingDate = '';
	let pendingDateOff = '';

	while (offset < record.length) {
		const nextStart = record.indexOf('<', offset);

		if (nextStart === -1) {
			break;
		}

		const nextEnd = record.indexOf('>', nextStart + 1);

		if (nextEnd === -1) {
			throw new Error('Malformed ADIF field: missing closing bracket.');
		}

		const descriptor = record.slice(nextStart + 1, nextEnd).trim();
		const [rawName, rawLength] = descriptor.split(':');
		const fieldName = rawName?.trim().toUpperCase();
		const length = Number(rawLength);

		if (!fieldName || !Number.isInteger(length) || length < 0) {
			throw new Error(`Malformed ADIF field descriptor: <${descriptor}>.`);
		}

		const valueStart = nextEnd + 1;
		const valueEnd = valueStart + length;

		if (valueEnd > record.length) {
			throw new Error(`Malformed ADIF field ${fieldName}: declared length exceeds record.`);
		}

		const value = record.slice(valueStart, valueEnd);

		if (SPECIAL_DATE_FIELDS.has(fieldName)) {
			switch (fieldName) {
				case 'QSO_DATE':
					pendingDate = normalizeDate(value);
					break;
				case 'TIME_ON':
					if (pendingDate) {
						qso.time_on = combineDateTime(pendingDate, normalizeTime(value));
					}
					break;
				case 'QSO_DATE_OFF':
					pendingDateOff = normalizeDate(value);
					break;
				case 'TIME_OFF': {
					const dateOff = pendingDateOff || pendingDate;
					if (dateOff) {
						qso.time_off = combineDateTime(dateOff, normalizeTime(value));
					}
					break;
				}
			}
		} else {
			const mappedField = ADIF_TO_DB_MAP[fieldName] as keyof QSOInsert | undefined;

			if (mappedField) {
				assignGenericField(qso, mappedField, value);
			} else if (EYEBALL_FLAG_FIELDS.has(fieldName) && booleanFlag(value)) {
				qso.is_eyeball = true;
			}
		}

		offset = valueEnd;
	}

	if (qso.prop_mode === 'EYE') {
		qso.is_eyeball = true;
	}

	return hasRequiredFields(qso) ? qso : undefined;
}

export function parseADIF(content: string): QSOInsert[] {
	const records = bodyAfterHeader(content).split(/<EOR>/i);
	const qsos: QSOInsert[] = [];
	const seen = new Set<string>();

	for (const record of records) {
		if (!record.trim()) {
			continue;
		}

		const qso = parseRecord(record);

		if (!qso) {
			continue;
		}

		const key = duplicateKey(qso);

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		qsos.push(qso);
	}

	return qsos;
}
