import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	QSLCard,
	QSLCardInsert,
	QSLCardUpdate,
	QSLMethod,
	QSLStats,
	QSLStatus
} from '$lib/logic/types/qsl';
import { notFoundError, toAppError } from '$lib/logic/errors';
import {
	DATABASE_READ_DEADLINE_MS,
	DATABASE_WRITE_DEADLINE_MS,
	withDeadline
} from '$lib/logic/deadline';

const QSL_COLUMNS =
	'*, qso:qsos!qsl_cards_qso_id_fkey(id, callsign, time_on, band, mode, verified_at)';

function createEmptyQSLStats(): QSLStats {
	return {
		total: 0,
		byMethod: {
			paper: 0,
			lotw: 0,
			eqsl: 0
		},
		byStatus: {
			pending: 0,
			sent: 0,
			received: 0,
			confirmed: 0,
			invalid: 0
		}
	};
}

function accumulateStatus(stats: QSLStats, status: QSLStatus | null | undefined): void {
	if (!status) {
		return;
	}

	stats.byStatus[status] += 1;
}

function buildQSLStats(cards: QSLCard[]): QSLStats {
	const stats = createEmptyQSLStats();

	stats.total = cards.length;

	for (const card of cards) {
		stats.byMethod[card.method] += 1;
		accumulateStatus(stats, card.sent_status);
		accumulateStatus(stats, card.received_status);
	}

	return stats;
}

export async function createQSLCard(
	supabase: SupabaseClient,
	qsl: QSLCardInsert
): Promise<QSLCard> {
	const { data, error } = await withDeadline(
		'create QSL card',
		DATABASE_WRITE_DEADLINE_MS,
		(signal) => supabase.from('qsl_cards').insert(qsl).select('*').abortSignal(signal).single()
	);

	if (error) {
		throw toAppError(error, 'create QSL card');
	}

	return data as QSLCard;
}

export async function getQSLCardsByQSO(
	supabase: SupabaseClient,
	qsoId: string
): Promise<QSLCard[]> {
	const { data, error } = await withDeadline(
		'list QSL cards by QSO',
		DATABASE_READ_DEADLINE_MS,
		(signal) =>
			supabase.from('qsl_cards').select(QSL_COLUMNS).eq('qso_id', qsoId).abortSignal(signal)
	);

	if (error) {
		throw toAppError(error, 'list QSL cards by QSO');
	}

	return (data ?? []) as QSLCard[];
}

export async function getQSLCards(
	supabase: SupabaseClient,
	filter?: { method?: QSLMethod; status?: QSLStatus }
): Promise<QSLCard[]> {
	let query = supabase.from('qsl_cards').select(QSL_COLUMNS);

	if (filter?.method) {
		query = query.eq('method', filter.method);
	}

	if (filter?.status) {
		query = query.or(`sent_status.eq.${filter.status},received_status.eq.${filter.status}`);
	}

	const { data, error } = await withDeadline(
		'list QSL cards',
		DATABASE_READ_DEADLINE_MS,
		(signal) => query.abortSignal(signal)
	);

	if (error) {
		throw toAppError(error, 'list QSL cards');
	}

	return (data ?? []) as QSLCard[];
}

export async function updateQSLCard(
	supabase: SupabaseClient,
	id: string,
	updates: QSLCardUpdate
): Promise<QSLCard> {
	const { data, error } = await withDeadline(
		'update QSL card',
		DATABASE_WRITE_DEADLINE_MS,
		(signal) =>
			supabase
				.from('qsl_cards')
				.update(updates)
				.eq('id', id)
				.select('*')
				.abortSignal(signal)
				.maybeSingle()
	);

	if (error) {
		throw toAppError(error, 'update QSL card');
	}
	if (!data) throw notFoundError('update QSL card');

	return data as QSLCard;
}

export async function deleteQSLCard(supabase: SupabaseClient, id: string): Promise<string> {
	const { data, error } = await withDeadline(
		'delete QSL card',
		DATABASE_WRITE_DEADLINE_MS,
		(signal) =>
			supabase
				.from('qsl_cards')
				.delete()
				.eq('id', id)
				.select('id')
				.abortSignal(signal)
				.maybeSingle()
	);

	if (error) {
		throw toAppError(error, 'delete QSL card');
	}
	if (!data) throw notFoundError('delete QSL card');
	return String(data.id);
}

export async function getQSLStats(supabase: SupabaseClient): Promise<QSLStats> {
	const cards = await getQSLCards(supabase);

	return buildQSLStats(cards);
}
