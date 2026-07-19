import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	PaginatedResult,
	QSO,
	QSOFilter,
	QSOInsert,
	QSOSort,
	QSOStats,
	QSOUpdate
} from '$lib/logic/types/qso';
import { validateQSO } from '$lib/logic/validation';
import { notFoundError, toAppError } from '$lib/logic/errors';
import { AppError } from '$lib/logic/errors';
import {
	DATABASE_READ_DEADLINE_MS,
	DATABASE_WRITE_DEADLINE_MS,
	withDeadline
} from '$lib/logic/deadline';

const QSO_COLUMNS =
	'id, profile_id, callsign, time_on, time_off, band, freq, mode, submode, rst_sent, rst_rcvd, tx_pwr, name, qth, grid_square, comment, dxcc, country, cq_zone, itu_zone, cont, qsl_sent, qsl_sent_via, qsl_rcvd, qsl_rcvd_via, lotw_qsl_sent, lotw_qsl_rcvd, eqsl_qsl_sent, eqsl_qsl_rcvd, prop_mode, sat_name, ant_az, ant_el, distance, operator, is_eyeball, latitude, longitude, verified_at, created_at, updated_at';

function validationError(qso: QSOInsert): Error | null {
	const result = validateQSO(qso);

	if (result.valid) {
		return null;
	}

	return new AppError(
		'validation',
		'validate QSO',
		`Invalid QSO: ${result.errors.map((error) => `${error.field}:${error.code}`).join(', ')}`
	);
}

function assertValidQSO(qso: QSOInsert): void {
	const error = validationError(qso);

	if (error) {
		throw toAppError(error, 'create QSO');
	}
}

function normalizePage(value: number | undefined): number {
	return Math.max(1, Math.trunc(value ?? 1));
}

function normalizeLimit(value: number | undefined): number {
	return Math.max(1, Math.trunc(value ?? 50));
}

export async function createQSO(
	supabase: SupabaseClient,
	qso: QSOInsert,
	externalSignal?: AbortSignal
): Promise<QSO> {
	assertValidQSO(qso);

	const { data, error } = await withDeadline(
		'create QSO',
		DATABASE_WRITE_DEADLINE_MS,
		(signal) => supabase.from('qsos').insert(qso).select(QSO_COLUMNS).abortSignal(signal).single(),
		externalSignal
	);

	if (error) {
		throw toAppError(error, 'create QSO');
	}

	return data as QSO;
}

function nextDay(dateStr: string): string {
	const [y, m, d] = dateStr.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d + 1));
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export async function getQSOs(
	supabase: SupabaseClient,
	filter: QSOFilter = {},
	sort: QSOSort = { field: 'time_on', direction: 'desc' },
	page?: number,
	limit?: number
): Promise<PaginatedResult<QSO>> {
	const currentPage = normalizePage(page);
	const pageLimit = normalizeLimit(limit);
	const from = (currentPage - 1) * pageLimit;
	const to = from + pageLimit - 1;

	let query = supabase.from('qsos').select(QSO_COLUMNS, { count: 'exact' });

	if (filter.callsign) {
		query = query.ilike('callsign', `%${filter.callsign}%`);
	}

	if (filter.dateFrom) {
		query = query.gte('time_on', `${filter.dateFrom}T00:00:00Z`);
	}

	if (filter.dateTo) {
		query = query.lt('time_on', `${nextDay(filter.dateTo)}T00:00:00Z`);
	}

	if (filter.band) {
		query = query.eq('band', filter.band);
	}

	if (filter.mode) {
		query = query.eq('mode', filter.mode);
	}

	if (filter.country) {
		query = query.eq('country', filter.country);
	}

	const { data, error, count } = await withDeadline(
		'list QSOs',
		DATABASE_READ_DEADLINE_MS,
		(signal) =>
			query
				.order(sort.field, { ascending: sort.direction === 'asc' })
				.range(from, to)
				.abortSignal(signal)
	);

	if (error) {
		throw toAppError(error, 'list QSOs');
	}

	const total = count ?? data?.length ?? 0;

	return {
		data: (data ?? []) as QSO[],
		total,
		page: currentPage,
		limit: pageLimit,
		totalPages: Math.ceil(total / pageLimit)
	};
}

export async function getQSOById(supabase: SupabaseClient, id: string): Promise<QSO | null> {
	const { data, error } = await withDeadline('load QSO', DATABASE_READ_DEADLINE_MS, (signal) =>
		supabase.from('qsos').select(QSO_COLUMNS).eq('id', id).abortSignal(signal).maybeSingle()
	);

	if (error) {
		throw toAppError(error, 'load QSO');
	}

	return (data as QSO | null) ?? null;
}

export async function updateQSO(
	supabase: SupabaseClient,
	id: string,
	updates: QSOUpdate,
	externalSignal?: AbortSignal
): Promise<QSO> {
	const { data, error } = await withDeadline(
		'update QSO',
		DATABASE_WRITE_DEADLINE_MS,
		(signal) =>
			supabase
				.from('qsos')
				.update(updates)
				.eq('id', id)
				.select(QSO_COLUMNS)
				.abortSignal(signal)
				.maybeSingle(),
		externalSignal
	);

	if (error) {
		throw toAppError(error, 'update QSO');
	}
	if (!data) throw notFoundError('update QSO');

	return data as QSO;
}

export async function deleteQSO(supabase: SupabaseClient, id: string): Promise<string> {
	const { data, error } = await withDeadline('delete QSO', DATABASE_WRITE_DEADLINE_MS, (signal) =>
		supabase.from('qsos').delete().eq('id', id).select('id').abortSignal(signal).maybeSingle()
	);

	if (error) {
		throw toAppError(error, 'delete QSO');
	}
	if (!data) throw notFoundError('delete QSO');
	return String(data.id);
}

export async function bulkCreateQSOs(
	supabase: SupabaseClient,
	qsos: QSOInsert[],
	options: { signal?: AbortSignal; onProgress?: (processed: number, total: number) => void } = {}
): Promise<{
	success: QSO[];
	errors: Array<{
		qso: QSOInsert;
		error: string;
		kind: import('$lib/logic/errors').RequestErrorKind;
	}>;
}> {
	const success: QSO[] = [];
	const errors: Array<{
		qso: QSOInsert;
		error: string;
		kind: import('$lib/logic/errors').RequestErrorKind;
	}> = [];

	for (const [index, qso] of qsos.entries()) {
		if (options.signal?.aborted) {
			throw new AppError('unknown', 'import ADIF', 'ADIF import cancelled');
		}
		try {
			success.push(await createQSO(supabase, qso, options.signal));
		} catch (error) {
			const appError = toAppError(error, 'import QSO');
			errors.push({ qso, error: appError.message, kind: appError.kind });
		}
		options.onProgress?.(index + 1, qsos.length);
	}

	return { success, errors };
}

export async function getQSOStats(supabase: SupabaseClient): Promise<QSOStats> {
	const { data, error, count } = await withDeadline(
		'load QSO statistics',
		DATABASE_READ_DEADLINE_MS,
		(signal) =>
			supabase
				.from('qsos')
				.select('callsign, country, grid_square', { count: 'exact' })
				.abortSignal(signal)
	);

	if (error) {
		throw toAppError(error, 'load QSO statistics');
	}

	const rows = (data ?? []) as Array<Pick<QSO, 'callsign' | 'country' | 'grid_square'>>;
	const callsigns = new Set(rows.map((row) => row.callsign).filter(Boolean));
	const countries = new Set(rows.map((row) => row.country).filter(Boolean));
	const grids = new Set(rows.map((row) => row.grid_square).filter(Boolean));

	return {
		totalQSOs: count ?? rows.length,
		uniqueCallsigns: callsigns.size,
		uniqueCountries: countries.size,
		uniqueGrids: grids.size
	};
}
