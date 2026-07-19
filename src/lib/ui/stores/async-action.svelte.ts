import { withDeadline } from '$lib/logic/deadline';
import { AppError, toAppError } from '$lib/logic/errors';

export type AsyncActionStatus = 'idle' | 'pending' | 'success' | 'error';

export function createAsyncActionState<T>() {
	let status = $state<AsyncActionStatus>('idle');
	let value = $state<T | null>(null);
	let error = $state<AppError | null>(null);
	let requestId = 0;
	let controller: AbortController | null = null;

	async function run(
		operation: string,
		timeoutMs: number,
		callback: (signal: AbortSignal) => Promise<T>
	): Promise<T> {
		if (status === 'pending') {
			throw new AppError('conflict', operation, `${operation} is already pending`);
		}

		const currentRequestId = ++requestId;
		controller = new AbortController();
		status = 'pending';
		error = null;

		try {
			const result = await withDeadline(operation, timeoutMs, callback, controller.signal);
			if (currentRequestId === requestId) {
				value = result;
				status = 'success';
			}
			return result;
		} catch (cause) {
			const nextError = toAppError(cause, operation);
			if (currentRequestId === requestId) {
				error = nextError;
				status = 'error';
			}
			throw nextError;
		} finally {
			if (currentRequestId === requestId) controller = null;
		}
	}

	function cancel() {
		requestId += 1;
		controller?.abort();
		controller = null;
		status = 'idle';
	}

	function reset() {
		cancel();
		value = null;
		error = null;
	}

	return {
		get status() {
			return status;
		},
		get value() {
			return value;
		},
		get error() {
			return error;
		},
		get pending() {
			return status === 'pending';
		},
		run,
		cancel,
		reset
	};
}
