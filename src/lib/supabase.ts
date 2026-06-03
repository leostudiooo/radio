import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

const url = env.PUBLIC_SUPABASE_URL;
const anonKey = env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
	throw new Error('Missing Supabase public environment variables.');
}

export const supabase = createClient(url, anonKey);
