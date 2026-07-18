import type { Band } from '$lib/logic/types/qso';

const FREQUENCY_BANDS: ReadonlyArray<{ min: number; max: number; band: Band }> = [
	{ min: 1.8, max: 2.0, band: '160m' },
	{ min: 3.5, max: 4.0, band: '80m' },
	{ min: 5.0, max: 5.5, band: '60m' },
	{ min: 7.0, max: 7.3, band: '40m' },
	{ min: 10.0, max: 10.15, band: '30m' },
	{ min: 14.0, max: 14.35, band: '20m' },
	{ min: 18.0, max: 18.17, band: '17m' },
	{ min: 21.0, max: 21.45, band: '15m' },
	{ min: 24.0, max: 24.99, band: '12m' },
	{ min: 28.0, max: 29.7, band: '10m' },
	{ min: 50.0, max: 54.0, band: '6m' },
	{ min: 70.0, max: 71.0, band: '4m' },
	{ min: 144.0, max: 148.0, band: '2m' },
	{ min: 430.0, max: 440.0, band: '70cm' },
	{ min: 1240.0, max: 1300.0, band: '23cm' }
];

export function bandFromFrequency(value: string | number): Band | undefined {
	const frequency = typeof value === 'number' ? value : Number.parseFloat(value);
	if (!Number.isFinite(frequency)) return undefined;

	return FREQUENCY_BANDS.find(({ min, max }) => frequency >= min && frequency <= max)?.band;
}

export function canReplaceWithLookup(
	current: string,
	initial: string | undefined,
	lastLookupValue: string | undefined
): boolean {
	return current === '' || current === initial || current === lastLookupValue;
}
