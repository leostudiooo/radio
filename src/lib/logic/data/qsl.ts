import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	QSLCard,
	QSLCardInsert,
	QSLCardUpdate,
	QSLMethod,
	QSLStats,
	QSLStatus
} from '$lib/logic/types/qsl';

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
	const { data, error } = await supabase.from('qsl_cards').insert(qsl).select('*').single();

	if (error) {
		throw error;
	}

	return data as QSLCard;
}

export async function getQSLCardsByQSO(
	supabase: SupabaseClient,
	qsoId: string
): Promise<QSLCard[]> {
	const { data, error } = await supabase.from('qsl_cards').select(QSL_COLUMNS).eq('qso_id', qsoId);

	if (error) {
		return [];
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

	const { data, error } = await query;

	if (error) {
		return [];
	}

	return (data ?? []) as QSLCard[];
}

export async function updateQSLCard(
	supabase: SupabaseClient,
	id: string,
	updates: QSLCardUpdate
): Promise<QSLCard> {
	const { data, error } = await supabase
		.from('qsl_cards')
		.update(updates)
		.eq('id', id)
		.select('*')
		.single();

	if (error) {
		throw error;
	}

	return data as QSLCard;
}

export async function deleteQSLCard(supabase: SupabaseClient, id: string): Promise<void> {
	const { error } = await supabase.from('qsl_cards').delete().eq('id', id);

	if (error) {
		throw error;
	}
}

export async function getQSLStats(supabase: SupabaseClient): Promise<QSLStats> {
	const cards = await getQSLCards(supabase);

	return buildQSLStats(cards);
}
