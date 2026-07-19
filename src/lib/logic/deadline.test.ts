import { afterEach, describe, expect, it, vi } from 'vitest';
import { withDeadline } from './deadline';

describe('withDeadline', () => {
	afterEach(() => vi.useRealTimers());

	it('rejects a non-settling operation at the deadline', async () => {
		vi.useFakeTimers();
		const operation = withDeadline('never settles', 100, () => new Promise<never>(() => undefined));
		const rejection = expect(operation).rejects.toMatchObject({
			kind: 'timeout',
			operation: 'never settles',
			retryable: true
		});

		await vi.advanceTimersByTimeAsync(100);
		await rejection;
	});

	it('aborts the callback signal when the deadline expires', async () => {
		vi.useFakeTimers();
		let signal: AbortSignal | undefined;
		const operation = withDeadline('abort work', 50, (value) => {
			signal = value;
			return new Promise<never>(() => undefined);
		});
		const rejection = expect(operation).rejects.toMatchObject({ kind: 'timeout' });

		await vi.advanceTimersByTimeAsync(50);
		await rejection;
		expect(signal?.aborted).toBe(true);
	});

	it('does not start work when the external signal is already aborted', async () => {
		const controller = new AbortController();
		controller.abort();
		const callback = vi.fn(async () => 'late');

		await expect(
			withDeadline('cancelled work', 100, callback, controller.signal)
		).rejects.toMatchObject({ operation: 'cancelled work' });
		expect(callback).not.toHaveBeenCalled();
	});
});
