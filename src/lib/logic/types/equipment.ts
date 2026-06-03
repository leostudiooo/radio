export const EQUIPMENT_TYPES = [
	'transceiver',
	'receiver',
	'transmitter',
	'antenna',
	'amplifier',
	'filter',
	'other'
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export interface Equipment {
	id: string;
	profile_id: string;
	name: string;
	type: EquipmentType;
	manufacturer?: string;
	model?: string;
	serial_number?: string;
	description?: string;
	is_active: boolean;
	created_at: string;
}

export interface EquipmentInsert extends Omit<Equipment, 'id' | 'created_at'> {}

export interface EquipmentUpdate extends Partial<EquipmentInsert> {}
