import { HTTP_DEADLINE_MS } from '$lib/logic/deadline';

export function createDeadlineFetch(timeoutMs = HTTP_DEADLINE_MS): typeof fetch {
	return async (input: RequestInfo | URL, init?: RequestInit) => {
		const controller = new AbortController();
		const externalSignal = init?.signal;
		const abortFromExternal = () => controller.abort(externalSignal?.reason);

		if (externalSignal?.aborted) abortFromExternal();
		else externalSignal?.addEventListener('abort', abortFromExternal, { once: true });

		const timeout = setTimeout(() => controller.abort(), timeoutMs);
		try {
			return await fetch(input, { ...init, signal: controller.signal });
		} finally {
			clearTimeout(timeout);
			externalSignal?.removeEventListener('abort', abortFromExternal);
		}
	};
}
