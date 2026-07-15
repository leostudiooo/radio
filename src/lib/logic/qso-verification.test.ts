import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
	confirmQSOByCode,
	generateVerificationCode,
	getQSOByVerificationCode,
	markQSOSentWithCode
} from './qso-verification';

interface QueryResult {
	data: unknown;
	error: { code?: string; message?: string } | null;
}

class QueryMock {
	upserts: unknown[] = [];

	constructor(private readonly result: QueryResult) {}

	upsert = vi.fn(async (value: unknown): Promise<QueryResult> => {
		this.upserts.push(value);
		return this.result;
	});
}

function createSupabase(rpcResults: QueryResult[], queries: QueryMock[]): SupabaseClient {
	let rpcIndex = 0;
	let queryIndex = 0;
	return {
		rpc: vi.fn(async () => rpcResults[rpcIndex++]),
		from: vi.fn(() => queries[queryIndex++])
	} as unknown as SupabaseClient;
}

describe('QSO verification', () => {
	it('generates a Crockford base32 code in XXXX-XXXX format', () => {
		const code = generateVerificationCode((values) => {
			values.set([0, 1, 2, 3, 4, 5, 6, 7]);
			return values;
		});

		expect(code).toBe('0123-4567');
		expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
		expect(code).not.toMatch(/[ILOU]/);
	});

	it('retries after a verification code collision and creates a sent paper card', async () => {
		const paperCard = new QueryMock({ data: null, error: null });
		const supabase = createSupabase(
			[
				{ data: null, error: null },
				{ data: null, error: { code: '23505', message: 'duplicate key' } },
				{ data: '89ABCDEF', error: null }
			],
			[paperCard]
		);
		const generate = vi.fn().mockReturnValueOnce('0123-4567').mockReturnValueOnce('89AB-CDEF');

		await expect(markQSOSentWithCode(supabase, 'qso-1', generate)).resolves.toEqual({
			code: '89AB-CDEF'
		});
		expect(generate).toHaveBeenCalledTimes(2);
		expect(supabase.rpc).toHaveBeenNthCalledWith(3, 'issue_qso_verification_code', {
			p_qso_id: 'qso-1',
			p_code: '89ABCDEF'
		});
		expect(paperCard.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				qso_id: 'qso-1',
				method: 'paper',
				sent_status: 'sent'
			}),
			{ onConflict: 'qso_id,method' }
		);
	});

	it('returns an already-issued code and still ensures the paper card is marked sent', async () => {
		const paperCard = new QueryMock({ data: null, error: null });
		const supabase = createSupabase([{ data: 'GHJKMNPQ', error: null }], [paperCard]);

		await expect(markQSOSentWithCode(supabase, 'qso-1')).resolves.toEqual({
			code: 'GHJK-MNPQ'
		});
		expect(paperCard.upsert).toHaveBeenCalledOnce();
	});

	it('normalizes codes for lookup and confirmation RPCs', async () => {
		const qso = {
			id: 'qso-1',
			callsign: 'K1ABC',
			time_on: '2026-07-10T12:00:00Z',
			band: '70cm',
			mode: 'FM',
			verified_at: '2026-07-13T00:00:00Z'
		};
		const rpc = vi
			.fn()
			.mockResolvedValueOnce({ data: [qso], error: null })
			.mockResolvedValueOnce({ data: [{ ...qso, already_verified: true }], error: null });
		const supabase = { rpc } as unknown as SupabaseClient;

		await expect(getQSOByVerificationCode(supabase, 'rstv-wxyz')).resolves.toEqual(qso);
		await expect(confirmQSOByCode(supabase, 'rstvwxyz')).resolves.toEqual({
			alreadyVerified: true,
			qso
		});
		expect(rpc).toHaveBeenNthCalledWith(1, 'get_qso_by_verification_code', {
			code_input: 'RSTVWXYZ'
		});
		expect(rpc).toHaveBeenNthCalledWith(2, 'confirm_qso_by_code', {
			code_input: 'RSTVWXYZ'
		});
	});
});
