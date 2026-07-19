import type { SupabaseClient } from '@supabase/supabase-js';
import type { Equipment, EquipmentInsert, EquipmentUpdate } from '$lib/logic/types/equipment';
import { notFoundError, toAppError } from '$lib/logic/errors';
import {
	DATABASE_READ_DEADLINE_MS,
	DATABASE_WRITE_DEADLINE_MS,
	withDeadline
} from '$lib/logic/deadline';

const EQUIPMENT_SELECT_COLUMNS =
	'id, profile_id, name, type, manufacturer, model, serial_number, description, is_active, created_at';

type ErrorLike = {
	message?: string;
};

type EquipmentQueryResult = {
	data: Equipment | Equipment[] | null;
	error: ErrorLike | null;
};

type EquipmentCollectionQuery = {
	eq: (column: string, value: string | boolean) => EquipmentCollectionQuery;
	abortSignal: (signal: AbortSignal) => EquipmentCollectionQuery;
	then: <TResult1 = EquipmentQueryResult, TResult2 = never>(
		onfulfilled?: ((value: EquipmentQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	) => PromiseLike<TResult1 | TResult2>;
};

function equipmentFromResult(data: Equipment | null): Equipment | null {
	return data;
}

export async function createEquipment(
	supabase: SupabaseClient,
	item: EquipmentInsert
): Promise<Equipment> {
	const { data, error } = await withDeadline(
		'create equipment',
		DATABASE_WRITE_DEADLINE_MS,
		(signal) =>
			supabase
				.from('equipment')
				.insert(item)
				.select(EQUIPMENT_SELECT_COLUMNS)
				.abortSignal(signal)
				.single()
	);

	if (error) {
		throw toAppError(error, 'create equipment');
	}

	return data as Equipment;
}

export async function getEquipment(
	supabase: SupabaseClient,
	activeOnly = false,
	profileId?: string
): Promise<Equipment[]> {
	let query = supabase
		.from('equipment')
		.select(EQUIPMENT_SELECT_COLUMNS) as unknown as EquipmentCollectionQuery;

	if (activeOnly) {
		query = query.eq('is_active', true);
	}

	if (profileId) {
		query = query.eq('profile_id', profileId);
	}

	const { data, error } = await withDeadline(
		'list equipment',
		DATABASE_READ_DEADLINE_MS,
		(signal) => query.abortSignal(signal)
	);

	if (error) {
		throw toAppError(error, 'list equipment');
	}

	return Array.isArray(data) ? data : [];
}

export async function getEquipmentById(
	supabase: SupabaseClient,
	id: string
): Promise<Equipment | null> {
	const { data, error } = await withDeadline(
		'load equipment',
		DATABASE_READ_DEADLINE_MS,
		(signal) =>
			supabase
				.from('equipment')
				.select(EQUIPMENT_SELECT_COLUMNS)
				.eq('id', id)
				.abortSignal(signal)
				.maybeSingle()
	);

	if (error) {
		throw toAppError(error, 'load equipment');
	}

	return equipmentFromResult(data as Equipment | null);
}

export async function updateEquipment(
	supabase: SupabaseClient,
	id: string,
	updates: EquipmentUpdate
): Promise<Equipment> {
	const { data, error } = await withDeadline(
		'update equipment',
		DATABASE_WRITE_DEADLINE_MS,
		(signal) =>
			supabase
				.from('equipment')
				.update(updates)
				.eq('id', id)
				.select(EQUIPMENT_SELECT_COLUMNS)
				.abortSignal(signal)
				.maybeSingle()
	);

	if (error) {
		throw toAppError(error, 'update equipment');
	}
	if (!data) throw notFoundError('update equipment');

	return data as Equipment;
}

export async function deleteEquipment(supabase: SupabaseClient, id: string): Promise<string> {
	const { data, error } = await withDeadline(
		'delete equipment',
		DATABASE_WRITE_DEADLINE_MS,
		(signal) =>
			supabase
				.from('equipment')
				.delete()
				.eq('id', id)
				.select('id')
				.abortSignal(signal)
				.maybeSingle()
	);

	if (error) {
		throw toAppError(error, 'delete equipment');
	}
	if (!data) throw notFoundError('delete equipment');
	return String(data.id);
}

export async function toggleEquipmentActive(
	supabase: SupabaseClient,
	id: string
): Promise<Equipment> {
	const current = await getEquipmentById(supabase, id);

	if (!current) {
		throw notFoundError('toggle equipment');
	}

	return updateEquipment(supabase, id, { is_active: !current.is_active });
}
