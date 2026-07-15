import type { Equipment } from '$lib/logic/types/equipment';
import type { QSO } from '$lib/logic/types/qso';

export type LogMode = 'quick' | 'standard';

export const QUICK_RST_VALUES = ['59', '57', '55', '46'];
export const FALLBACK_FM_FREQUENCIES = [
	'430.61',
	'438',
	'431.7625',
	'431.7525',
	'438.5',
	'145.775'
];

export type QuickDefaultFields = {
	logMode: LogMode;
	band: string;
	mode: string;
	rstSent: string;
	rstRcvd: string;
	power: string;
};

export type QuickStationCommentFields = {
	notes: string;
	myRig: string;
	myAntenna: string;
	otherRig: string;
	otherPower: string;
	otherAntenna: string;
	otherQth: string;
};

export type QuickStationCommentLabels = Omit<
	Record<keyof QuickStationCommentFields, string>,
	'notes'
>;

export function initialQuickDefaults(formMode: 'create' | 'edit'): QuickDefaultFields {
	const quick = formMode === 'create';

	return {
		logMode: quick ? 'quick' : 'standard',
		band: quick ? '70cm' : '',
		mode: quick ? 'FM' : '',
		rstSent: quick ? '59' : '',
		rstRcvd: quick ? '59' : '',
		power: quick ? '5' : ''
	};
}

export function applyQuickModeDefaults(fields: QuickDefaultFields): QuickDefaultFields {
	return {
		...fields,
		logMode: 'quick',
		mode: fields.mode || 'FM',
		band: fields.band || '70cm',
		rstSent: fields.rstSent || '59',
		rstRcvd: fields.rstRcvd || '59',
		power: fields.power || '5'
	};
}

export function recentFrequencyOptions(recentQSOs: QSO[]): string[] {
	const values: string[] = [];

	for (const qso of recentQSOs) {
		const value = qso.freq != null ? String(qso.freq) : '';
		if (value && !values.includes(value)) {
			values.push(value);
		}
	}

	for (const value of FALLBACK_FM_FREQUENCIES) {
		if (!values.includes(value)) {
			values.push(value);
		}
	}

	return values.slice(0, 8);
}

export function powerOptions(recentQSOs: QSO[]): string[] {
	const values: string[] = [];

	for (const qso of recentQSOs) {
		const value = qso.tx_pwr != null ? String(qso.tx_pwr) : '';
		if (value && !values.includes(value)) {
			values.push(value);
		}
	}

	for (const value of ['5', '2']) {
		if (!values.includes(value)) {
			values.push(value);
		}
	}

	return values.slice(0, 5);
}

export function activeRigOptions(activeEquipment: Equipment[]): string[] {
	return activeEquipment.filter((item) => item.type !== 'antenna').map((item) => item.name);
}

export function activeAntennaOptions(activeEquipment: Equipment[]): string[] {
	return activeEquipment.filter((item) => item.type === 'antenna').map((item) => item.name);
}

export function activeEquipmentDefaults(activeEquipment: Equipment[]) {
	return {
		rig: activeRigOptions(activeEquipment)[0] ?? '',
		antenna: activeAntennaOptions(activeEquipment)[0] ?? ''
	};
}

export function composeQuickComment(
	labels: QuickStationCommentLabels,
	fields: QuickStationCommentFields
): string {
	const lines: string[] = [];
	const notes = fields.notes.trim();
	if (notes) lines.push(notes);

	const helperLines = [
		[labels.myRig, fields.myRig],
		[labels.myAntenna, fields.myAntenna],
		[labels.otherRig, fields.otherRig],
		[labels.otherPower, fields.otherPower],
		[labels.otherAntenna, fields.otherAntenna],
		[labels.otherQth, fields.otherQth]
	]
		.filter(([, value]) => value.trim())
		.map(([label, value]) => `${label}: ${value.trim()}`);

	if (helperLines.length > 0) {
		lines.push(helperLines.join('; '));
	}

	return lines.join('\n');
}
