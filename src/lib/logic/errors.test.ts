import { describe, expect, it } from 'vitest';
import { AppError, toAppError } from './errors';

describe('request error classification', () => {
	it.each([
		[{ status: 401 }, 'auth'],
		[{ status: 403 }, 'permission'],
		[{ status: 404 }, 'not-found'],
		[{ status: 409 }, 'conflict'],
		[{ status: 400 }, 'validation'],
		[{ status: 503 }, 'server']
	] as const)('maps %o to %s', (error, kind) => {
		expect(toAppError(error, 'test')).toMatchObject({ kind, operation: 'test' });
	});

	it('preserves an existing AppError', () => {
		const error = new AppError('timeout', 'test', 'timed out', { retryable: true });
		expect(toAppError(error, 'other')).toBe(error);
	});
});
