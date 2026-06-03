import type { Session, User } from '@supabase/supabase-js';

export interface AuthResult {
	success: boolean;
	error?: string;
	errorCode?: string;
	session?: Session;
	user?: User;
}

export interface Profile {
	id: string;
	callsign: string;
	grid_square?: string;
	qth?: string;
	created_at: string;
}
