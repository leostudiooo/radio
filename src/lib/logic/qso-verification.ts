import type { SupabaseClient } from '@supabase/supabase-js';

const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const MAX_CODE_ATTEMPTS = 8;

export interface PublicQSOInfo {
	id: string;
	callsign: string;
	time_on: string;
	band?: string;
	mode?: string;
	rst_sent?: string;
	rst_rcvd?: string;
	verified_at?: string;
}

export interface QSOConfirmation {
	alreadyVerified: boolean;
	qso: PublicQSOInfo;
}

type RandomValues = (values: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;

interface VerificationRow extends PublicQSOInfo {
	already_verified?: boolean;
}

export function normalizeVerificationCode(code: string): string {
	return code.replaceAll('-', '').toUpperCase();
}

export function formatVerificationCode(code: string): string {
	const normalized = normalizeVerificationCode(code);
	return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

function firstRow(data: unknown): VerificationRow | null {
	if (!Array.isArray(data) || data.length === 0) return null;
	return data[0] as VerificationRow;
}

function publicQSOFromRow(row: VerificationRow): PublicQSOInfo {
	return {
		id: row.id,
		callsign: row.callsign,
		time_on: row.time_on,
		band: row.band ?? undefined,
		mode: row.mode ?? undefined,
		rst_sent: row.rst_sent ?? undefined,
		rst_rcvd: row.rst_rcvd ?? undefined,
		verified_at: row.verified_at ?? undefined
	};
}

async function markPaperCardSent(supabase: SupabaseClient, qsoId: string): Promise<void> {
	const today = new Date().toISOString().slice(0, 10);
	const { error } = await supabase.from('qsl_cards').upsert(
		{
			qso_id: qsoId,
			method: 'paper',
			sent_status: 'sent',
			sent_date: today
		},
		{ onConflict: 'qso_id,method' }
	);

	if (error) throw error;
}

export function generateVerificationCode(
	randomValues: RandomValues = (values) => crypto.getRandomValues(values)
): string {
	const bytes = randomValues(new Uint8Array(new ArrayBuffer(8)));
	const raw = Array.from(bytes, (byte) => CROCKFORD_ALPHABET[byte & 31]).join('');
	return formatVerificationCode(raw);
}

export async function markQSOSentWithCode(
	supabase: SupabaseClient,
	qsoId: string,
	codeGenerator: () => string = generateVerificationCode
): Promise<{ code: string }> {
	const existingCode = await getQSOAdminVerificationCode(supabase, qsoId);
	if (existingCode) {
		await markPaperCardSent(supabase, qsoId);
		return { code: formatVerificationCode(existingCode) };
	}

	for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
		const displayCode = codeGenerator();
		const storedCode = normalizeVerificationCode(displayCode);
		const { data, error } = await supabase.rpc('issue_qso_verification_code', {
			p_qso_id: qsoId,
			p_code: storedCode
		});

		if (error?.code === '23505') continue;
		if (error) throw error;

		const savedCode = typeof data === 'string' ? data : null;
		if (savedCode) {
			await markPaperCardSent(supabase, qsoId);
			return { code: formatVerificationCode(savedCode) };
		}

		const concurrentCode = await getQSOAdminVerificationCode(supabase, qsoId);
		if (concurrentCode) {
			await markPaperCardSent(supabase, qsoId);
			return { code: formatVerificationCode(concurrentCode) };
		}
	}

	throw new Error('Unable to generate a unique verification code');
}

export async function getQSOAdminVerificationCode(
	supabase: SupabaseClient,
	qsoId: string
): Promise<string | null> {
	const { data, error } = await supabase.rpc('get_admin_qso_verification_code', {
		p_qso_id: qsoId
	});

	if (error) throw error;
	const code = typeof data === 'string' ? data : null;
	return code ? formatVerificationCode(code) : null;
}

export async function getQSOByVerificationCode(
	supabase: SupabaseClient,
	code: string
): Promise<PublicQSOInfo | null> {
	const { data, error } = await supabase.rpc('get_qso_by_verification_code', {
		code_input: normalizeVerificationCode(code)
	});

	if (error) throw error;
	const row = firstRow(data);
	return row ? publicQSOFromRow(row) : null;
}

export async function confirmQSOByCode(
	supabase: SupabaseClient,
	code: string
): Promise<QSOConfirmation | null> {
	const { data, error } = await supabase.rpc('confirm_qso_by_code', {
		code_input: normalizeVerificationCode(code)
	});

	if (error) throw error;
	const row = firstRow(data);
	if (!row) return null;

	return {
		alreadyVerified: Boolean(row.already_verified),
		qso: publicQSOFromRow(row)
	};
}
