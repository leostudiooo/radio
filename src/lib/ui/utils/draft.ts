import { AppError } from '$lib/logic/errors';

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface DraftEnvelope<T> {
	version: number;
	savedAt: number;
	data: T;
}

export interface DraftStore<T> {
	load(): T | null;
	save(data: T): void;
	clear(): void;
}

export function createDraftStore<T>(
	key: string,
	version = 1,
	maxAgeMs = DEFAULT_MAX_AGE_MS,
	storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage
): DraftStore<T> {
	function requireStorage(): Storage {
		if (!storage)
			throw new AppError('unknown', 'access draft storage', 'Draft storage unavailable');
		return storage;
	}

	return {
		load() {
			const target = requireStorage();
			const raw = target.getItem(key);
			if (!raw) return null;

			try {
				const envelope = JSON.parse(raw) as DraftEnvelope<T>;
				if (
					envelope.version !== version ||
					!Number.isFinite(envelope.savedAt) ||
					Date.now() - envelope.savedAt > maxAgeMs
				) {
					target.removeItem(key);
					return null;
				}
				return envelope.data;
			} catch {
				target.removeItem(key);
				return null;
			}
		},
		save(data) {
			requireStorage().setItem(
				key,
				JSON.stringify({ version, savedAt: Date.now(), data } satisfies DraftEnvelope<T>)
			);
		},
		clear() {
			requireStorage().removeItem(key);
		}
	};
}
