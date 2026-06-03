export const QSL_METHODS = ['paper', 'lotw', 'eqsl'] as const;
export type QSLMethod = (typeof QSL_METHODS)[number];

export const QSL_STATUSES = ['pending', 'sent', 'received', 'confirmed', 'invalid'] as const;
export type QSLStatus = (typeof QSL_STATUSES)[number];

export interface QSLCard {
	id: string;
	qso_id: string;
	method: QSLMethod;
	sent_status?: QSLStatus;
	received_status?: QSLStatus;
	sent_date?: string;
	received_date?: string;
	notes?: string;
	image_url?: string;
	created_at: string;
}

export interface QSLCardInsert extends Omit<QSLCard, 'id' | 'created_at'> {}
export interface QSLCardUpdate extends Partial<QSLCardInsert> {}

export interface QSLStats {
	total: number;
	byMethod: Record<QSLMethod, number>;
	byStatus: Record<QSLStatus, number>;
}
