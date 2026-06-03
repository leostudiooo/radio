import type { QSOInsert, ValidationResult } from '$lib/logic/types/qso';
import { BANDS, MODES } from '$lib/logic/types/qso';

const PHONE_MODES = new Set(['SSB', 'FM', 'AM']);

function normalize(value: string): string {
	return value.trim().toUpperCase();
}

function hasValue(value: string | number | undefined): boolean {
	return value !== undefined && value !== '';
}

function isValidDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

function isValidTime(value: string): boolean {
	return /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value);
}

function isValidMode(mode: string): boolean {
	return MODES.includes(normalize(mode) as (typeof MODES)[number]);
}

export function validateCallsign(callsign: string): boolean {
	const normalized = normalize(callsign);

	if (normalized.length < 3 || normalized.length > 20) {
		return false;
	}

	return /^[A-Z0-9]{1,3}\d[A-Z0-9]{1,4}(?:\/(?:P|M|MM))?$/.test(normalized);
}

export function validateGridSquare(grid: string): boolean {
	return /^[A-R]{2}\d{2}(?:[A-X]{2})?$/i.test(grid.trim());
}

export function validateBand(band: string): boolean {
	return BANDS.includes(band.trim().toLowerCase() as (typeof BANDS)[number]);
}

export function validateRST(rst: string, mode: string): boolean {
	const normalizedMode = normalize(mode);
	const value = rst.trim();

	if (PHONE_MODES.has(normalizedMode)) {
		return /^[1-5][1-9](?:[1-9])?$/.test(value);
	}

	return /^[1-5][1-9][1-9]$/.test(value);
}

export function validateQSO(qso: QSOInsert): ValidationResult {
	const errors: ValidationResult['errors'] = [];

	if (!qso.callsign?.trim()) {
		errors.push({ field: 'callsign', code: 'REQUIRED' });
	} else if (!validateCallsign(qso.callsign)) {
		errors.push({ field: 'callsign', code: 'INVALID_FORMAT' });
	}

	if (!qso.qso_date?.trim()) {
		errors.push({ field: 'qso_date', code: 'REQUIRED' });
	} else if (!isValidDate(qso.qso_date)) {
		errors.push({ field: 'qso_date', code: 'INVALID_FORMAT' });
	}

	if (!qso.time_on?.trim()) {
		errors.push({ field: 'time_on', code: 'REQUIRED' });
	} else if (!isValidTime(qso.time_on)) {
		errors.push({ field: 'time_on', code: 'INVALID_FORMAT' });
	}

	if (!qso.is_eyeball && !hasValue(qso.band) && !hasValue(qso.freq)) {
		errors.push({ field: 'band', code: 'REQUIRED' });
	}

	if (qso.band && !validateBand(qso.band)) {
		errors.push({ field: 'band', code: 'INVALID_BAND' });
	}

	if (qso.mode && !isValidMode(qso.mode)) {
		errors.push({ field: 'mode', code: 'INVALID_MODE' });
	}

	if (qso.grid_square && !validateGridSquare(qso.grid_square)) {
		errors.push({ field: 'grid_square', code: 'INVALID_GRID' });
	}

	const mode = qso.mode ?? 'CW';

	if (qso.rst_sent && !validateRST(qso.rst_sent, mode)) {
		errors.push({ field: 'rst_sent', code: 'INVALID_RST' });
	}

	if (qso.rst_rcvd && !validateRST(qso.rst_rcvd, mode)) {
		errors.push({ field: 'rst_rcvd', code: 'INVALID_RST' });
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
