export const QSL_METHODS = ['paper', 'lotw', 'eqsl'] as const;
export type QSLMethod = (typeof QSL_METHODS)[number];

export const QSL_STATUSES = ['pending', 'sent', 'received', 'confirmed', 'invalid'] as const;
export type QSLStatus = (typeof QSL_STATUSES)[number];

export const QSL_SENT_STATUSES = ['pending', 'sent', 'invalid'] as const;
export type QSLSentStatus = (typeof QSL_SENT_STATUSES)[number];

export const QSL_RECEIVED_STATUSES = ['pending', 'received', 'confirmed', 'invalid'] as const;
export type QSLReceivedStatus = (typeof QSL_RECEIVED_STATUSES)[number];

export interface QSLQSO {
	id: string;
	callsign: string;
	time_on: string;
	band?: string | null;
	mode?: string | null;
	verified_at?: string | null;
}

export interface QSLCard {
	id: string;
	qso_id: string;
	method: QSLMethod;
	sent_status?: QSLSentStatus | null;
	received_status?: QSLReceivedStatus | null;
	sent_date?: string | null;
	received_date?: string | null;
	sent_via?: string | null;
	received_via?: string | null;
	notes?: string | null;
	image_url?: string | null;
	created_at: string;
	qso?: QSLQSO | null;
}

export type QSLCardInsert = Omit<QSLCard, 'id' | 'created_at' | 'qso'>;
export type QSLCardUpdate = Partial<Omit<QSLCardInsert, 'qso_id' | 'method'>>;

export interface QSLStats {
	total: number;
	byMethod: Record<QSLMethod, number>;
	byStatus: Record<QSLStatus, number>;
}
