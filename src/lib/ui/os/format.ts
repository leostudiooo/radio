import type { Equipment } from '$lib/logic/types/equipment';
import type { QSO } from '$lib/logic/types/qso';
import type { VFSListEntry } from './types';

export const ESC = '\x1b[';

export const ANSI = {
	reset: `${ESC}0m`,
	bold: `${ESC}1m`,
	green: `${ESC}32m`,
	cyan: `${ESC}36m`,
	muted: `${ESC}90m`,
	clear: `${ESC}3J${ESC}2J${ESC}H`
};

export function lines(...linesToJoin: string[]): string {
	return linesToJoin.join('\r\n');
}

export function formatJSON(value: unknown): string {
	return JSON.stringify(value, null, 2).replace(/\n/g, '\r\n');
}

export function formatOperatorInfo(operatorInfo: Record<string, string>): string {
	const entries = Object.entries(operatorInfo).map(([key, value], index, values) => {
		const suffix = index < values.length - 1 ? ',' : '';
		return `  "${key}": "${value}"${suffix}`;
	});

	return lines(
		`${ANSI.muted}// operator_info.json${ANSI.reset}`,
		`${ANSI.muted}// Version: 1${ANSI.reset}`,
		`${ANSI.muted}// Created: 2026-05-20${ANSI.reset}`,
		`${ANSI.muted}// Updated: 2026-05-22${ANSI.reset}`,
		'{',
		...entries,
		'}'
	);
}

export function formatQSOList(qsos: QSO[], total: number): string {
	if (qsos.length === 0) return 'No QSOs found.';

	return lines(
		`QSOs ${qsos.length}/${total}`,
		...qsos.map((qso) =>
			[
				qso.id,
				qso.callsign,
				qso.time_on?.slice(0, 16).replace('T', ' '),
				qso.band ?? '-',
				qso.mode ?? '-'
			].join('  ')
		)
	);
}

export function formatEquipmentList(items: Equipment[]): string {
	if (items.length === 0) return 'No equipment found.';

	return lines(
		`Equipment ${items.length}`,
		...items.map((item) =>
			[
				item.id,
				item.is_active ? '[x]' : '[ ]',
				item.name,
				item.type,
				item.model ?? item.manufacturer ?? '-'
			].join('  ')
		)
	);
}

const TERM_WIDTH = 80;

export function formatLsOutput(entries: VFSListEntry[]): string {
	if (entries.length === 0) return '';

	const names = entries.map((entry) => entry.name);
	const maxLen = Math.max(...names.map((name) => name.length));
	const colWidth = maxLen + 2;
	const cols = Math.max(1, Math.floor(TERM_WIDTH / colWidth));

	if (cols === 1 || names.length === 1) {
		return names.join('\r\n');
	}

	const rows: string[] = [];
	for (let i = 0; i < names.length; i += cols) {
		const row = names.slice(i, i + cols);
		rows.push(
			row
				.map((name) => name.padEnd(colWidth))
				.join('')
				.trimEnd()
		);
	}
	return rows.join('\r\n');
}
