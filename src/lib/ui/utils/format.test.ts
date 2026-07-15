import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, formatTime } from './format';

describe('date/time formatting', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('formats timestamps in UTC when local time is disabled', () => {
		const dateSpy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('UTC date');
		const timeSpy = vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('UTC time');

		expect(formatDate('2026-01-01T23:30:00Z', { useLocalTime: false })).toBe('UTC date');
		expect(formatTime('2026-01-01T23:30:00Z', { useLocalTime: false })).toBe('UTC time');
		expect(dateSpy.mock.calls[0]?.[1]).toMatchObject({ timeZone: 'UTC' });
		expect(timeSpy.mock.calls[0]?.[1]).toMatchObject({ timeZone: 'UTC' });
	});

	it('uses the browser timezone when local time is enabled', () => {
		const dateSpy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('local date');
		const timeSpy = vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('local time');

		expect(formatDate('2026-01-01T23:30:00Z', { useLocalTime: true })).toBe('local date');
		expect(formatTime('2026-01-01T23:30:00Z', { useLocalTime: true })).toBe('local time');
		expect(dateSpy.mock.calls[0]?.[1]).not.toHaveProperty('timeZone');
		expect(timeSpy.mock.calls[0]?.[1]).not.toHaveProperty('timeZone');
	});
});
