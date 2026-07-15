import { describe, expect, it, vi } from 'vitest';
import type { QSO } from '$lib/logic/types/qso';
import { createQsoDetailLoader, type QsoDetailLoadPatch } from './qso-detail-loader';

function createQSO(callsign = 'K1ABC'): QSO {
	return {
		id: 'qso-1',
		profile_id: 'profile-1',
		callsign,
		time_on: '2026-07-13T12:00:00Z',
		band: '70cm',
		mode: 'FM',
		is_eyeball: false,
		created_at: '2026-07-13T12:00:00Z',
		updated_at: '2026-07-13T12:00:00Z'
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((promiseResolve, promiseReject) => {
		resolve = promiseResolve;
		reject = promiseReject;
	});

	return { promise, resolve, reject };
}

describe('createQsoDetailLoader', () => {
	it('ignores stale public loads so they cannot clear an admin verification code', async () => {
		const publicQso = deferred<QSO | null>();
		const adminQso = deferred<QSO | null>();
		const adminCode = deferred<string | null>();
		const getQSOById = vi
			.fn()
			.mockReturnValueOnce(publicQso.promise)
			.mockReturnValueOnce(adminQso.promise);
		const getVerificationCode = vi.fn().mockReturnValueOnce(adminCode.promise);
		const patches: QsoDetailLoadPatch[] = [];
		const state = {
			qso: null as QSO | null,
			loading: false,
			notFound: false,
			verificationCode: null as string | null,
			confirmationUrl: ''
		};
		const loader = createQsoDetailLoader(
			{
				getQSOById,
				getVerificationCode,
				getConfirmationOrigin: () => 'https://radio.example'
			},
			(patch) => {
				patches.push(patch);
				Object.assign(state, patch);
			}
		);

		const publicLoad = loader.load('qso-1', false);
		const adminLoad = loader.load('qso-1', true);
		adminQso.resolve(createQSO('ADMIN'));
		adminCode.resolve('ABCD-EFGH');
		await adminLoad;

		expect(state.qso?.callsign).toBe('ADMIN');
		expect(state.verificationCode).toBe('ABCD-EFGH');
		expect(state.confirmationUrl).toBe('https://radio.example/qso/confirm');

		publicQso.resolve(createQSO('PUBLIC'));
		await publicLoad;

		expect(state.qso?.callsign).toBe('ADMIN');
		expect(state.verificationCode).toBe('ABCD-EFGH');
		expect(getVerificationCode).toHaveBeenCalledOnce();
		expect(patches.at(-1)).toMatchObject({
			qso: expect.objectContaining({ callsign: 'ADMIN' }),
			verificationCode: 'ABCD-EFGH'
		});
	});
});
