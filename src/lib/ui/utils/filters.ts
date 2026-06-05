import type { QSOFilter } from '$lib/logic/types/qso';

export function buildQSOFilter(opts: {
	callsign?: string;
	band?: string;
	mode?: string;
	dateFrom?: string;
	dateTo?: string;
}): QSOFilter {
	const f: QSOFilter = {};
	if (opts.callsign?.trim()) f.callsign = opts.callsign.trim();
	if (opts.band) f.band = opts.band;
	if (opts.mode) f.mode = opts.mode;
	if (opts.dateFrom) f.dateFrom = opts.dateFrom;
	if (opts.dateTo) f.dateTo = opts.dateTo;
	return f;
}
