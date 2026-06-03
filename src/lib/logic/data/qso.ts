import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaginatedResult, QSO, QSOFilter, QSOInsert, QSOSort, QSOStats, QSOUpdate } from '$lib/logic/types/qso';
import { validateQSO } from '$lib/logic/validation';

const QSO_COLUMNS =
	'id, profile_id, callsign, qso_date, time_on, time_off, band, freq, mode, submode, rst_sent, rst_rcvd, tx_pwr, name, qth, grid_square, comment, dxcc, country, cq_zone, itu_zone, cont, qsl_sent, qsl_sent_via, qsl_rcvd, qsl_rcvd_via, lotw_qsl_sent, lotw_qsl_rcvd, eqsl_qsl_sent, eqsl_qsl_rcvd, prop_mode, sat_name, ant_az, ant_el, distance, operator, is_eyeball, latitude, longitude, created_at, updated_at';

function validationError(qso: QSOInsert): Error | null {
	const result = validateQSO(qso);

	if (result.valid) {
		return null;
	}

	return new Error(
		`Invalid QSO: ${result.errors.map((error) => `${error.field}:${error.code}`).join(', ')}`
	);
}

function assertValidQSO(qso: QSOInsert): void {
	const error = validationError(qso);

	if (error) {
		throw error;
	}
}

function normalizePage(value: number | undefined): number {
	return Math.max(1, Math.trunc(value ?? 1));
}

function normalizeLimit(value: number | undefined): number {
	return Math.max(1, Math.trunc(value ?? 50));
}

export async function createQSO(supabase: SupabaseClient, qso: QSOInsert): Promise<QSO> {
	assertValidQSO(qso);

	const { data, error } = await supabase.from('qsos').insert(qso).select(QSO_COLUMNS).single();

	if (error) {
		throw error;
	}

	return data as QSO;
}

export async function getQSOs(
	supabase: SupabaseClient,
	filter: QSOFilter = {},
	sort: QSOSort = { field: 'qso_date', direction: 'desc' },
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
		query = query.gte('qso_date', filter.dateFrom);
	}

	if (filter.dateTo) {
		query = query.lte('qso_date', filter.dateTo);
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

	const { data, error, count } = await query
		.order(sort.field, { ascending: sort.direction === 'asc' })
		.range(from, to);

	if (error) {
		throw error;
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
	const { data, error } = await supabase.from('qsos').select(QSO_COLUMNS).eq('id', id).maybeSingle();

	if (error) {
		throw error;
	}

	return (data as QSO | null) ?? null;
}

export async function updateQSO(
	supabase: SupabaseClient,
	id: string,
	updates: QSOUpdate
): Promise<QSO> {
	const { data, error } = await supabase
		.from('qsos')
		.update(updates)
		.eq('id', id)
		.select(QSO_COLUMNS)
		.single();

	if (error) {
		throw error;
	}

	return data as QSO;
}

export async function deleteQSO(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('qsos').delete().eq('id', id);

	if (error) {
		throw error;
	}
}

export async function bulkCreateQSOs(
	supabase: SupabaseClient,
	qsos: QSOInsert[]
): Promise<{ success: QSO[]; errors: Array<{ qso: QSOInsert; error: string }> }> {
	const success: QSO[] = [];
	const errors: Array<{ qso: QSOInsert; error: string }> = [];

	for (const qso of qsos) {
		try {
			success.push(await createQSO(supabase, qso));
		} catch (error) {
			errors.push({ qso, error: error instanceof Error ? error.message : 'Unknown error' });
		}
	}

	return { success, errors };
}

export async function getQSOStats(supabase: SupabaseClient): Promise<QSOStats> {
	const { data, error, count } = await supabase
		.from('qsos')
		.select('callsign, country, grid_square', { count: 'exact' });

	if (error) {
		throw error;
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
