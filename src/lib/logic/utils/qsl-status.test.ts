import { describe, expect, it } from 'vitest';
import type { QSLCard } from '$lib/logic/types/qsl';
import { nextQSLReceivedUpdate, nextQSLSentUpdate } from './qsl-status';

function card(overrides: Partial<QSLCard> = {}): QSLCard {
	return {
		id: 'card-1',
		qso_id: 'qso-1',
		method: 'paper',
		created_at: '2026-07-18T00:00:00Z',
		...overrides
	};
}

describe('QSL status transitions', () => {
	it('cycles sent status without using received-only states', () => {
		expect(nextQSLSentUpdate(card(), '2026-07-18')).toEqual({
			sent_status: 'sent',
			sent_date: '2026-07-18'
		});
		expect(nextQSLSentUpdate(card({ sent_status: 'pending' }), '2026-07-18')).toEqual({
			sent_status: 'sent',
			sent_date: '2026-07-18'
		});
		expect(
			nextQSLSentUpdate(card({ sent_status: 'sent', sent_date: '2026-07-10' }), '2026-07-18')
		).toEqual({ sent_status: 'invalid', sent_date: '2026-07-10' });
	});

	it('cycles received status and maintains its date', () => {
		expect(nextQSLReceivedUpdate(card({ received_status: 'pending' }), '2026-07-18')).toEqual({
			received_status: 'received',
			received_date: '2026-07-18'
		});
		expect(
			nextQSLReceivedUpdate(
				card({ received_status: 'received', received_date: '2026-07-12' }),
				'2026-07-18'
			)
		).toEqual({ received_status: 'confirmed', received_date: '2026-07-12' });
	});
});
