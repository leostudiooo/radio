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

function createSupabase(rpcResults: QueryResult[]): SupabaseClient {
	let rpcIndex = 0;
	return {
		rpc: vi.fn(async () => rpcResults[rpcIndex++])
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

	it('retries after a verification code collision', async () => {
		const supabase = createSupabase([
			{ data: null, error: { code: '23505', message: 'duplicate key' } },
			{ data: '89ABCDEF', error: null }
		]);
		const generate = vi.fn().mockReturnValueOnce('0123-4567').mockReturnValueOnce('89AB-CDEF');

		await expect(markQSOSentWithCode(supabase, 'qso-1', generate)).resolves.toEqual({
			code: '89AB-CDEF'
		});
		expect(generate).toHaveBeenCalledTimes(2);
		expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'issue_qso_verification_code', {
			p_qso_id: 'qso-1',
			p_code: '89ABCDEF'
		});
	});

	it('returns an already-issued code from the atomic RPC', async () => {
		const supabase = createSupabase([{ data: 'GHJKMNPQ', error: null }]);

		await expect(markQSOSentWithCode(supabase, 'qso-1')).resolves.toEqual({
			code: 'GHJK-MNPQ'
		});
		expect(supabase.rpc).toHaveBeenCalledOnce();
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
