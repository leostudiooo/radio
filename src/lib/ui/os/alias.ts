import type { Equipment } from '$lib/logic/types/equipment';
import type { QSO } from '$lib/logic/types/qso';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slug(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function parseUtcParts(timeOn: string): { date: string; time: string } {
	const match = timeOn.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):/);
	if (match) {
		return { date: match[1], time: `${match[2]}${match[3]}` };
	}

	const iso = new Date(timeOn).toISOString();
	return { date: iso.slice(0, 10), time: iso.slice(11, 15) };
}

function shortId(id: string): string {
	return id.slice(0, 8).toLowerCase();
}

export function qsoAlias(qso: QSO): string {
	const { date, time } = parseUtcParts(qso.time_on);
	const callsign = slug(qso.callsign);
	const band = slug(qso.band ?? '');
	const mode = slug(qso.mode ?? '');
	return `${date}_${time}Z_${callsign}_${band}_${mode}_${shortId(qso.id)}`;
}

export function equipmentAlias(item: Equipment): string {
	const type = slug(item.type);
	const model =
		item.manufacturer && item.model
			? slug(`${item.manufacturer}-${item.model}`)
			: slug(item.model ?? item.manufacturer ?? item.name);
	return `${type}_${model}_${shortId(item.id)}`;
}

export function isUuidLike(stem: string): boolean {
	return UUID_RE.test(stem);
}

export function findQSOIdByAlias(qsos: QSO[], aliasStem: string): string | null {
	for (const qso of qsos) {
		if (qsoAlias(qso) === aliasStem) return qso.id;
	}
	return null;
}

export function findEquipmentIdByAlias(items: Equipment[], aliasStem: string): string | null {
	for (const item of items) {
		if (equipmentAlias(item) === aliasStem) return item.id;
	}
	return null;
}
