export type RequestErrorKind =
	| 'timeout'
	| 'offline'
	| 'auth'
	| 'permission'
	| 'not-found'
	| 'conflict'
	| 'validation'
	| 'server'
	| 'unknown';

type ErrorLike = {
	name?: string;
	message?: string;
	code?: string;
	status?: number;
};

export class AppError extends Error {
	readonly kind: RequestErrorKind;
	readonly operation: string;
	readonly retryable: boolean;

	constructor(
		kind: RequestErrorKind,
		operation: string,
		message: string,
		options: { cause?: unknown; retryable?: boolean } = {}
	) {
		super(message, { cause: options.cause });
		this.name = 'AppError';
		this.kind = kind;
		this.operation = operation;
		this.retryable = options.retryable ?? false;
	}
}

export function toAppError(error: unknown, operation: string): AppError {
	if (error instanceof AppError) return error;

	const value = (error ?? {}) as ErrorLike;
	const status = value.status;
	const code = value.code ?? '';
	const message = value.message ?? `Failed to ${operation}`;

	if (value.name === 'AbortError' || code === 'TIMEOUT') {
		return new AppError('timeout', operation, `${operation} timed out`, {
			cause: error,
			retryable: true
		});
	}
	if (status === 401 || code === 'PGRST301' || code.startsWith('refresh_token_')) {
		return new AppError('auth', operation, message, { cause: error });
	}
	if (status === 403 || code === '42501') {
		return new AppError('permission', operation, message, { cause: error });
	}
	if (status === 404) {
		return new AppError('not-found', operation, message, { cause: error });
	}
	if (status === 409 || code === '23505') {
		return new AppError('conflict', operation, message, { cause: error });
	}
	if (status === 400 || code.startsWith('22')) {
		return new AppError('validation', operation, message, { cause: error });
	}
	if ((status !== undefined && status >= 500) || code === '520' || code === '503') {
		return new AppError('server', operation, message, { cause: error, retryable: true });
	}
	if (error instanceof TypeError) {
		return new AppError('offline', operation, message, { cause: error, retryable: true });
	}

	return new AppError('unknown', operation, message, { cause: error });
}

export function notFoundError(operation: string): AppError {
	return new AppError('not-found', operation, `${operation} did not match a visible record`);
}
