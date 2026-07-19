import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { DATABASE_READ_DEADLINE_MS } from '$lib/logic/deadline';
import { createDeadlineFetch } from '$lib/network';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
	throw new Error('Missing Supabase public environment variables.');
}

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
	db: {
		timeout: DATABASE_READ_DEADLINE_MS
	},
	auth: {
		autoRefreshToken: false,
		persistSession: true,
		experimental: {
			passkey: true
		}
	},
	global: {
		fetch: createDeadlineFetch(DATABASE_READ_DEADLINE_MS)
	}
});
