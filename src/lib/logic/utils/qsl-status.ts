import {
	QSL_RECEIVED_STATUSES,
	QSL_SENT_STATUSES,
	type QSLCard,
	type QSLCardUpdate,
	type QSLReceivedStatus,
	type QSLSentStatus,
	type QSLStatus
} from '$lib/logic/types/qsl';

function nextStatus<T extends QSLStatus>(current: T | null | undefined, cycle: readonly T[]): T {
	const index = cycle.indexOf(current ?? cycle[0]!);
	return cycle[index + 1] ?? cycle[0]!;
}

export function nextQSLSentUpdate(
	card: QSLCard,
	today: string
): Pick<QSLCardUpdate, 'sent_status' | 'sent_date'> {
	const status: QSLSentStatus = nextStatus(card.sent_status, QSL_SENT_STATUSES);

	return {
		sent_status: status,
		sent_date: status === 'pending' ? null : (card.sent_date ?? (status === 'sent' ? today : null))
	};
}

export function nextQSLReceivedUpdate(
	card: QSLCard,
	today: string
): Pick<QSLCardUpdate, 'received_status' | 'received_date'> {
	const status: QSLReceivedStatus = nextStatus(card.received_status, QSL_RECEIVED_STATUSES);

	return {
		received_status: status,
		received_date:
			status === 'pending'
				? null
				: (card.received_date ?? (status === 'received' || status === 'confirmed' ? today : null))
	};
}
