import type { SupabaseClient } from '@supabase/supabase-js';
import { SITE_CONFIG } from '$lib/config';

export async function getStationProfile(supabase: SupabaseClient) {
	const { data, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('callsign', SITE_CONFIG.callsign)
		.single();

	if (error || !data) {
		return { callsign: SITE_CONFIG.callsign };
	}

	return data;
}
