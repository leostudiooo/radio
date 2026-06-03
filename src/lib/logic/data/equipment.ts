import type { SupabaseClient } from '@supabase/supabase-js';
import type { Equipment, EquipmentInsert, EquipmentUpdate } from '$lib/logic/types/equipment';

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
	const { data, error } = await supabase
		.from('equipment')
		.insert(item)
		.select(EQUIPMENT_SELECT_COLUMNS)
		.single();

	if (error) {
		throw error;
	}

	return data as Equipment;
}

export async function getEquipment(
	supabase: SupabaseClient,
	activeOnly = false
): Promise<Equipment[]> {
	let query = supabase.from('equipment').select(EQUIPMENT_SELECT_COLUMNS) as unknown as EquipmentCollectionQuery;

	if (activeOnly) {
		query = query.eq('is_active', true);
	}

	const { data, error } = await query;

	if (error) {
		return [];
	}

	return Array.isArray(data) ? data : [];
}

export async function getEquipmentById(
	supabase: SupabaseClient,
	id: string
): Promise<Equipment | null> {
	const { data, error } = await supabase
		.from('equipment')
		.select(EQUIPMENT_SELECT_COLUMNS)
		.eq('id', id)
		.single();

	if (error) {
		return null;
	}

	return equipmentFromResult(data as Equipment | null);
}

export async function updateEquipment(
	supabase: SupabaseClient,
	id: string,
	updates: EquipmentUpdate
): Promise<Equipment> {
	const { data, error } = await supabase
		.from('equipment')
		.update(updates)
		.eq('id', id)
		.select(EQUIPMENT_SELECT_COLUMNS)
		.single();

	if (error) {
		throw error;
	}

	return data as Equipment;
}

export async function deleteEquipment(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('equipment').delete().eq('id', id);

	if (error) {
		throw error;
	}
}

export async function toggleEquipmentActive(
	supabase: SupabaseClient,
	id: string
): Promise<Equipment> {
	const current = await getEquipmentById(supabase, id);

	if (!current) {
		throw new Error(`Equipment not found: ${id}`);
	}

	return updateEquipment(supabase, id, { is_active: !current.is_active });
}
