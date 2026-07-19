/**
 * Client helper for callsign lookup via CF Pages Function.
 * Lives in logic layer — no UI or Svelte dependencies.
 */

export interface CallsignInfo {
	callsign: string;
	name?: string;
	address?: string;
	grid_square?: string;
	dxcc?: number;
	country?: string;
	cq_zone?: number;
	itu_zone?: number;
	lat?: number;
	lon?: number;
}

export type CallsignLookupResult =
	| { status: 'found'; data: CallsignInfo }
	| { status: 'not-found' }
	| { status: 'invalid' }
	| { status: 'unavailable'; error: import('$lib/logic/errors').AppError };

import { HTTP_DEADLINE_MS, withDeadline } from '$lib/logic/deadline';
import { toAppError } from '$lib/logic/errors';

export async function lookupCallsign(
	callsign: string,
	signal?: AbortSignal
): Promise<CallsignLookupResult> {
	const normalized = callsign.trim().toUpperCase();

	if (normalized.length < 3 || normalized.length > 20) {
		return { status: 'invalid' };
	}

	try {
		const response = await withDeadline(
			'lookup callsign',
			HTTP_DEADLINE_MS,
			(deadlineSignal) =>
				fetch(`/api/callsign/${encodeURIComponent(normalized)}`, { signal: deadlineSignal }),
			signal
		);

		if (response.status === 404) return { status: 'not-found' };
		if (!response.ok) throw { status: response.status, message: `Callsign lookup failed` };

		const data: CallsignInfo = await response.json();

		if (!data || !data.callsign) {
			return { status: 'not-found' };
		}

		return { status: 'found', data };
	} catch (error) {
		return { status: 'unavailable', error: toAppError(error, 'lookup callsign') };
	}
}
