import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
	createEquipment,
	deleteEquipment,
	getEquipment,
	getEquipmentById,
	toggleEquipmentActive,
	updateEquipment
} from './equipment';
import type { Equipment } from '$lib/logic/types/equipment';

type QueryResult<T> = { data: T | null; error: Error | null };

interface EquipmentQueryBuilder<T> {
	select: (columns: string) => EquipmentQueryBuilder<T>;
	insert: (item: unknown) => EquipmentQueryBuilder<T>;
	update: (updates: unknown) => EquipmentQueryBuilder<T>;
	eq: (column: string, value: string | boolean) => EquipmentQueryBuilder<T>;
	abortSignal: (signal: AbortSignal) => EquipmentQueryBuilder<T>;
	single: () => Promise<QueryResult<T>>;
	maybeSingle: () => Promise<QueryResult<T>>;
	then: <TResult1 = QueryResult<T>, TResult2 = never>(
		onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	) => PromiseLike<TResult1 | TResult2>;
}

function createEquipmentRow(overrides: Partial<Equipment> = {}): Equipment {
	return {
		id: 'eq-1',
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

function createSupabase(overrides: Partial<SupabaseClient> = {}): SupabaseClient {
	return overrides as SupabaseClient;
}

function createSelectQuery<T>(result: QueryResult<T>) {
	const query = {
		select: vi.fn(() => query),
		insert: vi.fn(() => query),
		update: vi.fn(() => query),
		eq: vi.fn(() => query),
		abortSignal: vi.fn(() => query),
		single: vi.fn(async () => result),
		maybeSingle: vi.fn(async () => result),
		then: ((onfulfilled, onrejected) =>
			Promise.resolve(result).then(onfulfilled, onrejected)) as EquipmentQueryBuilder<T>['then']
	};

	return query as EquipmentQueryBuilder<T>;
}

function createDeleteQuery(result: QueryResult<{ id: string }>) {
	const query = {
		delete: vi.fn(() => query),
		eq: vi.fn(() => query),
		select: vi.fn(() => query),
		abortSignal: vi.fn(() => query),
		maybeSingle: vi.fn(async () => result)
	};
	return query;
}

describe('equipment logic helpers', () => {
	it('runs a CRUD cycle', async () => {
		const created = createEquipmentRow();
		const updated = createEquipmentRow({ name: 'FT-991A Mk2', is_active: false });
		const insertQuery = createSelectQuery({ data: created, error: null });
		const updateQuery = createSelectQuery({ data: updated, error: null });
		const getByIdQuery = createSelectQuery({ data: created, error: null });
		const deleteQuery = createDeleteQuery({ data: { id: 'eq-1' }, error: null });
		const from = vi
			.fn()
			.mockReturnValueOnce(insertQuery)
			.mockReturnValueOnce(getByIdQuery)
			.mockReturnValueOnce(updateQuery)
			.mockReturnValueOnce(deleteQuery);
		const supabase = createSupabase({ from } as unknown as SupabaseClient);

		await expect(
			createEquipment(supabase, {
				profile_id: 'profile-1',
				name: 'FT-991A',
				type: 'transceiver',
				manufacturer: 'Yaesu',
				model: 'FT-991A',
				serial_number: 'SN123456',
				description: 'Base station rig',
				is_active: true
			})
		).resolves.toEqual(created);

		await expect(getEquipmentById(supabase, 'eq-1')).resolves.toEqual(created);
		await expect(updateEquipment(supabase, 'eq-1', { name: 'FT-991A Mk2' })).resolves.toEqual(
			updated
		);
		await expect(deleteEquipment(supabase, 'eq-1')).resolves.toBe('eq-1');
	});

	it('filters active equipment when requested', async () => {
		const active = [
			createEquipmentRow(),
			createEquipmentRow({ id: 'eq-2', name: 'Dipole', type: 'antenna' })
		];
		const query = createSelectQuery({ data: active, error: null });
		const from = vi.fn(() => query);
		const supabase = createSupabase({ from } as unknown as SupabaseClient);

		await expect(getEquipment(supabase, true)).resolves.toEqual(active);
		expect(query.eq).toHaveBeenCalledWith('is_active', true);
	});

	it('can scope active equipment to one profile', async () => {
		const active = [createEquipmentRow()];
		const query = createSelectQuery({ data: active, error: null });
		const from = vi.fn(() => query);
		const supabase = createSupabase({ from } as unknown as SupabaseClient);

		await expect(getEquipment(supabase, true, 'profile-1')).resolves.toEqual(active);
		expect(query.eq).toHaveBeenNthCalledWith(1, 'is_active', true);
		expect(query.eq).toHaveBeenNthCalledWith(2, 'profile_id', 'profile-1');
	});

	it('toggles active state', async () => {
		const current = createEquipmentRow({ is_active: true });
		const toggled = createEquipmentRow({ is_active: false });
		const getQuery = createSelectQuery({ data: current, error: null });
		const updateQuery = createSelectQuery({ data: toggled, error: null });
		const from = vi.fn().mockReturnValueOnce(getQuery).mockReturnValueOnce(updateQuery);
		const supabase = createSupabase({ from } as unknown as SupabaseClient);

		await expect(toggleEquipmentActive(supabase, 'eq-1')).resolves.toEqual(toggled);
		expect(updateQuery.update).toHaveBeenCalledWith({ is_active: false });
	});
});
