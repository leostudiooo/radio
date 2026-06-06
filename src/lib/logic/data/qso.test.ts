import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { QSO, QSOInsert, QSOUpdate } from '$lib/logic/types/qso';
import {
	bulkCreateQSOs,
	createQSO,
	deleteQSO,
	getQSOById,
	getQSOs,
	getQSOStats,
	updateQSO
} from './qso';

type QueryResult<T> = { data: T | null; error: Error | null; count?: number | null };
type FilterValue = string | number | boolean;

class QueryMock<T> {
	inserted?: QSOInsert | QSOInsert[];
	updated?: QSOUpdate;
	deleted = false;
	filters: Array<{ method: string; field: string; value: FilterValue }> = [];
	ordered?: { field: string; ascending: boolean };
	ranged?: { from: number; to: number };

	constructor(private readonly response: QueryResult<T>) {}

	select = vi.fn((_columns?: string, _options?: { count?: 'exact' }): this => this);
	insert = vi.fn((value: QSOInsert | QSOInsert[]): this => {
		this.inserted = value;
		return this;
	});
	update = vi.fn((value: QSOUpdate): this => {
		this.updated = value;
		return this;
	});
	delete = vi.fn((): this => {
		this.deleted = true;
		return this;
	});
	eq = vi.fn((field: string, value: FilterValue): this => {
		this.filters.push({ method: 'eq', field, value });
		return this;
	});
	ilike = vi.fn((field: string, value: string): this => {
		this.filters.push({ method: 'ilike', field, value });
		return this;
	});
	gte = vi.fn((field: string, value: string): this => {
		this.filters.push({ method: 'gte', field, value });
		return this;
	});
	lte = vi.fn((field: string, value: string): this => {
		this.filters.push({ method: 'lte', field, value });
		return this;
	});
	lt = vi.fn((field: string, value: string): this => {
		this.filters.push({ method: 'lt', field, value });
		return this;
	});
	order = vi.fn((field: string, options: { ascending: boolean }): this => {
		this.ordered = { field, ascending: options.ascending };
		return this;
	});
	range = vi.fn(async (from: number, to: number): Promise<QueryResult<T>> => {
		this.ranged = { from, to };
		return this.response;
	});
	single = vi.fn(async (): Promise<QueryResult<T>> => this.response);
	maybeSingle = vi.fn(async (): Promise<QueryResult<T>> => this.response);
	then<TResult1 = QueryResult<T>, TResult2 = never>(
		onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	): Promise<TResult1 | TResult2> {
		return Promise.resolve(this.response).then(onfulfilled, onrejected);
	}
}

function createQSOInsert(overrides: Partial<QSOInsert> = {}): QSOInsert {
	return {
		profile_id: 'profile-1',
		callsign: 'K1ABC',
		time_on: '2026-01-15T12:34:56Z',
		band: '20m',
		mode: 'SSB',
		rst_sent: '59',
		rst_rcvd: '57',
		country: 'United States',
		grid_square: 'FN31',
		is_eyeball: false,
		...overrides
	};
}

function createQSORecord(overrides: Partial<QSO> = {}): QSO {
	return {
		...createQSOInsert(),
		id: 'qso-1',
		created_at: '2026-01-15T12:34:56.000Z',
		updated_at: '2026-01-15T12:34:56.000Z',
		...overrides
	};
}

function createSupabase<T>(query: QueryMock<T>): SupabaseClient {
	return { from: vi.fn(() => query) } as unknown as SupabaseClient;
}

describe('QSO data helpers', () => {
	it('creates a validated QSO and returns the inserted row', async () => {
		const qso = createQSORecord();
		const query = new QueryMock<QSO>({ data: qso, error: null });
		const supabase = createSupabase(query);

		await expect(createQSO(supabase, createQSOInsert())).resolves.toEqual(qso);
		expect(supabase.from).toHaveBeenCalledWith('qsos');
		expect(query.insert).toHaveBeenCalledWith(createQSOInsert());
		expect(query.select).toHaveBeenCalled();
		expect(query.single).toHaveBeenCalledOnce();
	});

	it('rejects invalid QSOs before writing to Supabase', async () => {
		const query = new QueryMock<QSO>({ data: null, error: null });
		const supabase = createSupabase(query);

		await expect(createQSO(supabase, createQSOInsert({ callsign: 'BAD' }))).rejects.toThrow(
			'Invalid QSO'
		);
		expect(query.insert).not.toHaveBeenCalled();
	});

	it('gets paginated QSOs with filters and sorting', async () => {
		const qso = createQSORecord();
		const query = new QueryMock<QSO[]>({ data: [qso], error: null, count: 12 });
		const supabase = createSupabase(query);

		await expect(
			getQSOs(
				supabase,
				{
					callsign: 'K1',
					dateFrom: '2026-01-01',
					dateTo: '2026-01-31',
					band: '20m',
					mode: 'SSB',
					country: 'United States'
				},
				{ field: 'time_on', direction: 'asc' },
				2,
				5
			)
		).resolves.toEqual({ data: [qso], total: 12, page: 2, limit: 5, totalPages: 3 });
		expect(query.filters).toEqual([
			{ method: 'ilike', field: 'callsign', value: '%K1%' },
			{ method: 'gte', field: 'time_on', value: '2026-01-01T00:00:00Z' },
			{ method: 'lt', field: 'time_on', value: '2026-02-01T00:00:00Z' },
			{ method: 'eq', field: 'band', value: '20m' },
			{ method: 'eq', field: 'mode', value: 'SSB' },
			{ method: 'eq', field: 'country', value: 'United States' }
		]);
		expect(query.ordered).toEqual({ field: 'time_on', ascending: true });
		expect(query.ranged).toEqual({ from: 5, to: 9 });
	});

	it('gets a QSO by id and returns null when not found', async () => {
		const qso = createQSORecord();
		const foundQuery = new QueryMock<QSO>({ data: qso, error: null });
		const missingQuery = new QueryMock<QSO>({ data: null, error: null });

		await expect(getQSOById(createSupabase(foundQuery), 'qso-1')).resolves.toEqual(qso);
		expect(foundQuery.eq).toHaveBeenCalledWith('id', 'qso-1');
		await expect(getQSOById(createSupabase(missingQuery), 'missing')).resolves.toBeNull();
	});

	it('updates a QSO and returns the updated row', async () => {
		const updated = createQSORecord({ callsign: 'N0CALL' });
		const query = new QueryMock<QSO>({ data: updated, error: null });
		const supabase = createSupabase(query);

		await expect(updateQSO(supabase, 'qso-1', { callsign: 'N0CALL' })).resolves.toEqual(updated);
		expect(query.update).toHaveBeenCalledWith({ callsign: 'N0CALL' });
		expect(query.eq).toHaveBeenCalledWith('id', 'qso-1');
	});

	it('deletes a QSO by id', async () => {
		const query = new QueryMock<null>({ data: null, error: null });
		const supabase = createSupabase(query);

		await expect(deleteQSO(supabase, 'qso-1')).resolves.toBeUndefined();
		expect(query.delete).toHaveBeenCalledOnce();
		expect(query.eq).toHaveBeenCalledWith('id', 'qso-1');
	});

	it('bulk creates QSOs and reports per-record errors', async () => {
		const qso = createQSORecord();
		const query = new QueryMock<QSO>({ data: qso, error: null });
		const supabase = createSupabase(query);
		const invalid = createQSOInsert({ callsign: 'BAD' });

		await expect(bulkCreateQSOs(supabase, [createQSOInsert(), invalid])).resolves.toEqual({
			success: [qso],
			errors: [{ qso: invalid, error: 'Invalid QSO: callsign:INVALID_FORMAT' }]
		});
	});

	it('computes aggregate QSO statistics', async () => {
		const rows = [
			createQSORecord({ callsign: 'K1ABC', country: 'United States', grid_square: 'FN31' }),
			createQSORecord({
				id: 'qso-2',
				callsign: 'K1ABC',
				country: 'United States',
				grid_square: 'FN31'
			}),
			createQSORecord({ id: 'qso-3', callsign: 'JA1ABC', country: 'Japan', grid_square: 'PM95' })
		];
		const query = new QueryMock<Array<Pick<QSO, 'callsign' | 'country' | 'grid_square'>>>({
			data: rows,
			error: null,
			count: 3
		});

		await expect(getQSOStats(createSupabase(query))).resolves.toEqual({
			totalQSOs: 3,
			uniqueCallsigns: 2,
			uniqueCountries: 2,
			uniqueGrids: 2
		});
	});

	it('throws Supabase errors from CRUD operations', async () => {
		const error = new Error('Database failed');
		const query = new QueryMock<QSO>({ data: null, error });
		const supabase = createSupabase(query);

		await expect(createQSO(supabase, createQSOInsert())).rejects.toThrow(error);
		await expect(updateQSO(supabase, 'qso-1', { callsign: 'N0CALL' })).rejects.toThrow(error);
	});
});
