import { AppError, toAppError } from '$lib/logic/errors';

export const AUTH_DEADLINE_MS = 10_000;
export const DATABASE_WRITE_DEADLINE_MS = 15_000;
export const DATABASE_READ_DEADLINE_MS = 20_000;
export const HTTP_DEADLINE_MS = 8_000;
export const FILE_READ_DEADLINE_MS = 10_000;
export const WEBAUTHN_DEADLINE_MS = 60_000;

export async function withDeadline<T>(
	operation: string,
	timeoutMs: number,
	callback: (signal: AbortSignal) => PromiseLike<T>,
	externalSignal?: AbortSignal
): Promise<T> {
	if (externalSignal?.aborted) {
		throw new AppError('unknown', operation, `${operation} was cancelled`, {
			cause: externalSignal.reason
		});
	}

	const controller = new AbortController();
	let rejectDeadline: (error: AppError) => void = () => undefined;
	const deadline = new Promise<never>((_, reject) => {
		rejectDeadline = reject;
	});
	const abortFromExternal = () => {
		const error = new AppError('unknown', operation, `${operation} was cancelled`, {
			cause: externalSignal?.reason
		});
		controller.abort(error);
		rejectDeadline(error);
	};

	externalSignal?.addEventListener('abort', abortFromExternal, { once: true });

	const timeout = setTimeout(() => {
		const error = new AppError('timeout', operation, `${operation} timed out`, { retryable: true });
		controller.abort(error);
		rejectDeadline(error);
	}, timeoutMs);

	try {
		return await Promise.race([Promise.resolve(callback(controller.signal)), deadline]);
	} catch (error) {
		throw toAppError(error, operation);
	} finally {
		clearTimeout(timeout);
		externalSignal?.removeEventListener('abort', abortFromExternal);
	}
}
