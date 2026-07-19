import { describe, expect, it, vi } from 'vitest';
import { createDraftStore } from './draft';

function memoryStorage(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => [...values.keys()][index] ?? null,
		removeItem: (key) => values.delete(key),
		setItem: (key, value) => values.set(key, value)
	};
}

describe('DraftStore', () => {
	it('saves, restores, and clears a draft', () => {
		const store = createDraftStore<{ callsign: string }>('draft', 1, 1000, memoryStorage());
		store.save({ callsign: 'BA4VUN' });
		expect(store.load()).toEqual({ callsign: 'BA4VUN' });
		store.clear();
		expect(store.load()).toBeNull();
	});

	it('discards expired drafts', () => {
		vi.useFakeTimers();
		const storage = memoryStorage();
		const store = createDraftStore<{ callsign: string }>('draft', 1, 100, storage);
		store.save({ callsign: 'BA4VUN' });
		vi.advanceTimersByTime(101);
		expect(store.load()).toBeNull();
		vi.useRealTimers();
	});

	it('discards drafts from another schema version', () => {
		const storage = memoryStorage();
		createDraftStore('draft', 1, 1000, storage).save({ value: 1 });
		expect(createDraftStore('draft', 2, 1000, storage).load()).toBeNull();
	});
});
