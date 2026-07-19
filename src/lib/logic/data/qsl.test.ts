import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { QSLCard } from '$lib/logic/types/qsl';
import {
	createQSLCard,
	deleteQSLCard,
	getQSLStats,
	getQSLCards,
	getQSLCardsByQSO,
	updateQSLCard
} from './qsl';

type QueryResult<T> = { data: T; error: Error | null };

type QslQuery<TList> = PromiseLike<QueryResult<TList>> & {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	eq: ReturnType<typeof vi.fn>;
	or: ReturnType<typeof vi.fn>;
	abortSignal: ReturnType<typeof vi.fn>;
	single: ReturnType<typeof vi.fn>;
	maybeSingle: ReturnType<typeof vi.fn>;
};

function createQSLCardRow(overrides: Partial<QSLCard> = {}): QSLCard {
	return {
		id: 'qsl-1',
		qso_id: 'qso-1',
		method: 'paper',
		sent_status: 'pending',
		received_status: undefined,
		sent_date: '2026-01-01',
		received_date: undefined,
		sent_via: 'D',
		received_via: undefined,
		notes: 'Test card',
		image_url: undefined,
		created_at: '2026-01-01T00:00:00.000Z',
		qso: {
			id: 'qso-1',
			callsign: 'BA4VUN',
			time_on: '2026-01-01T00:00:00.000Z',
			band: '20m',
			mode: 'SSB'
		},
		...overrides
	};
}

function createQslQuery<TList, TSingle>(options: {
	listResult: QueryResult<TList>;
	singleResult: QueryResult<TSingle>;
}): QslQuery<TList> {
	const query: Partial<QslQuery<TList>> = {};

	query.select = vi.fn(() => query);
	query.insert = vi.fn(() => query);
	query.update = vi.fn(() => query);
	query.delete = vi.fn(() => query);
	query.eq = vi.fn(() => query);
	query.or = vi.fn(() => query);
	query.abortSignal = vi.fn(() => query);
	query.single = vi.fn(async () => options.singleResult);
	query.maybeSingle = vi.fn(async () => options.singleResult);
	query.then = ((onfulfilled, onrejected) =>
		Promise.resolve(options.listResult).then(onfulfilled, onrejected)) as QslQuery<TList>['then'];

	return query as QslQuery<TList>;
}

function createSupabase(fromMock: ReturnType<typeof vi.fn>): SupabaseClient {
	return { from: fromMock } as unknown as SupabaseClient;
}

describe('QSL logic helpers', () => {
	it('runs a CRUD cycle for QSL cards', async () => {
		const created = createQSLCardRow();
		const updated = createQSLCardRow({
			sent_status: 'sent',
			received_status: 'received',
			sent_date: '2026-01-02',
			received_date: '2026-01-03'
		});

		const createQuery = createQslQuery({
			listResult: { data: created, error: null },
			singleResult: { data: created, error: null }
		});
		const listQuery = createQslQuery({
			listResult: { data: [created], error: null },
			singleResult: { data: created, error: null }
		});
		const updateQuery = createQslQuery({
			listResult: { data: updated, error: null },
			singleResult: { data: updated, error: null }
		});
		const deleteQuery = createQslQuery({
			listResult: { data: { id: 'qsl-1' }, error: null },
			singleResult: { data: { id: 'qsl-1' }, error: null }
		});
		const from = vi
			.fn()
			.mockImplementationOnce(() => createQuery)
			.mockImplementationOnce(() => listQuery)
			.mockImplementationOnce(() => updateQuery)
			.mockImplementationOnce(() => deleteQuery);
		const supabase = createSupabase(from);

		await expect(
			createQSLCard(supabase, {
				qso_id: 'qso-1',
				method: 'paper',
				sent_status: 'pending',
				notes: 'Test card'
			})
		).resolves.toEqual(created);
		expect(createQuery.insert).toHaveBeenCalledWith({
			qso_id: 'qso-1',
			method: 'paper',
			sent_status: 'pending',
			notes: 'Test card'
		});

		await expect(getQSLCardsByQSO(supabase, 'qso-1')).resolves.toEqual([created]);
		expect(listQuery.select).toHaveBeenCalledWith(expect.stringContaining('qso:qsos'));
		expect(listQuery.eq).toHaveBeenCalledWith('qso_id', 'qso-1');

		await expect(
			updateQSLCard(supabase, 'qsl-1', {
				sent_status: 'sent',
				received_status: 'received'
			})
		).resolves.toEqual(updated);
		expect(updateQuery.update).toHaveBeenCalledWith({
			sent_status: 'sent',
			received_status: 'received'
		});
		expect(updateQuery.eq).toHaveBeenCalledWith('id', 'qsl-1');

		await expect(deleteQSLCard(supabase, 'qsl-1')).resolves.toBe('qsl-1');
		expect(deleteQuery.delete).toHaveBeenCalledOnce();
		expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'qsl-1');
	});

	it('supports status-based filtering and card status transitions', async () => {
		const pendingCard = createQSLCardRow({ sent_status: 'pending', received_status: undefined });
		const sentCard = createQSLCardRow({ sent_status: 'sent', received_status: undefined });
		const receivedCard = createQSLCardRow({ sent_status: 'sent', received_status: 'received' });

		const pendingQuery = createQslQuery({
			listResult: { data: [pendingCard], error: null },
			singleResult: { data: pendingCard, error: null }
		});
		const updateQuery = createQslQuery({
			listResult: { data: sentCard, error: null },
			singleResult: { data: sentCard, error: null }
		});
		const receivedQuery = createQslQuery({
			listResult: { data: receivedCard, error: null },
			singleResult: { data: receivedCard, error: null }
		});
		const from = vi
			.fn()
			.mockImplementationOnce(() => pendingQuery)
			.mockImplementationOnce(() => updateQuery)
			.mockImplementationOnce(() => receivedQuery);
		const supabase = createSupabase(from);

		await expect(getQSLCards(supabase, { status: 'pending' })).resolves.toEqual([pendingCard]);
		expect(pendingQuery.or).toHaveBeenCalledWith(
			'sent_status.eq.pending,received_status.eq.pending'
		);

		await expect(updateQSLCard(supabase, 'qsl-1', { sent_status: 'sent' })).resolves.toEqual(
			sentCard
		);
		await expect(
			updateQSLCard(supabase, 'qsl-1', { received_status: 'received' })
		).resolves.toEqual(receivedCard);
	});

	it('aggregates QSL stats by method and status', async () => {
		const cards: QSLCard[] = [
			createQSLCardRow({
				method: 'paper',
				sent_status: 'pending',
				received_status: 'confirmed'
			}),
			createQSLCardRow({
				id: 'qsl-2',
				method: 'lotw',
				sent_status: 'sent',
				received_status: 'received'
			}),
			createQSLCardRow({
				id: 'qsl-3',
				method: 'eqsl',
				sent_status: 'invalid',
				received_status: undefined
			})
		];
		const query = createQslQuery({
			listResult: { data: cards, error: null },
			singleResult: { data: cards[0], error: null }
		});
		const supabase = createSupabase(vi.fn(() => query));

		await expect(getQSLStats(supabase)).resolves.toEqual({
			total: 3,
			byMethod: {
				paper: 1,
				lotw: 1,
				eqsl: 1
			},
			byStatus: {
				pending: 1,
				sent: 1,
				received: 1,
				confirmed: 1,
				invalid: 1
			}
		});
	});
});
