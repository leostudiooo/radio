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

export async function lookupCallsign(callsign: string): Promise<CallsignInfo | null> {
	const normalized = callsign.trim().toUpperCase();

	if (normalized.length < 3 || normalized.length > 20) {
		return null;
	}

	try {
		const response = await fetch(`/api/callsign/${encodeURIComponent(normalized)}`);

		if (!response.ok) {
			return null;
		}

		const data: CallsignInfo = await response.json();

		if (!data || !data.callsign) {
			return null;
		}

		return data;
	} catch {
		return null;
	}
}
