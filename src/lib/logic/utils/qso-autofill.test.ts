import { describe, expect, it } from 'vitest';
import { bandFromFrequency, canReplaceWithLookup } from './qso-autofill';

describe('QSO autofill', () => {
	it.each([
		[1.85, '160m'],
		['14.074', '20m'],
		[145.5, '2m'],
		['435', '70cm'],
		[1295, '23cm']
	])('maps %s MHz to %s', (frequency, expectedBand) => {
		expect(bandFromFrequency(frequency)).toBe(expectedBand);
	});

	it('does not guess a band for invalid or unsupported frequencies', () => {
		expect(bandFromFrequency('')).toBeUndefined();
		expect(bandFromFrequency('not-a-frequency')).toBeUndefined();
		expect(bandFromFrequency(100)).toBeUndefined();
	});

	it('only replaces blank, initial, or previously looked-up values', () => {
		expect(canReplaceWithLookup('', 'China', undefined)).toBe(true);
		expect(canReplaceWithLookup('China', 'China', undefined)).toBe(true);
		expect(canReplaceWithLookup('Japan', 'China', 'Japan')).toBe(true);
		expect(canReplaceWithLookup('Manual value', 'China', 'Japan')).toBe(false);
	});
});
