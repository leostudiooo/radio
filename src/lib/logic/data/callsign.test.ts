import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupCallsign } from './callsign';

describe('lookupCallsign', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns callsign info on successful lookup', async () => {
		const mockData = {
			callsign: 'BA4VUN',
			name: 'Test User',
			grid_square: 'OM89',
			country: 'China'
		};

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockData)
			})
		);

		const result = await lookupCallsign('BA4VUN');
		expect(result).toEqual(mockData);
		expect(fetch).toHaveBeenCalledWith('/api/callsign/BA4VUN');
	});

	it('returns null when callsign not found (404)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404
			})
		);

		const result = await lookupCallsign('INVALID');
		expect(result).toBeNull();
	});

	it('returns null on network error', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

		const result = await lookupCallsign('BA4VUN');
		expect(result).toBeNull();
	});

	it('returns null for too-short callsign', async () => {
		const result = await lookupCallsign('AB');
		expect(result).toBeNull();
	});

	it('returns null when response has no callsign', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ error: 'Not found' })
			})
		);

		const result = await lookupCallsign('BA4VUN');
		expect(result).toBeNull();
	});

	it('normalizes callsign to uppercase', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ callsign: 'BA4VUN' })
			})
		);

		await lookupCallsign('ba4vun');
		expect(fetch).toHaveBeenCalledWith('/api/callsign/BA4VUN');
	});
});
