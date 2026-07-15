export interface QSO {
	id: string;
	profile_id: string;
	callsign: string;
	time_on: string;
	time_off?: string;
	band?: string;
	freq?: number;
	mode?: string;
	submode?: string;
	rst_sent?: string;
	rst_rcvd?: string;
	tx_pwr?: number;
	name?: string;
	qth?: string;
	grid_square?: string;
	comment?: string;
	dxcc?: number;
	country?: string;
	cq_zone?: number;
	itu_zone?: number;
	cont?: string;
	qsl_sent?: string;
	qsl_sent_via?: string;
	qsl_rcvd?: string;
	qsl_rcvd_via?: string;
	lotw_qsl_sent?: string;
	lotw_qsl_rcvd?: string;
	eqsl_qsl_sent?: string;
	eqsl_qsl_rcvd?: string;
	prop_mode?: string;
	sat_name?: string;
	ant_az?: number;
	ant_el?: number;
	distance?: number;
	operator?: string;
	is_eyeball: boolean;
	latitude?: number;
	longitude?: number;
	verification_code?: string;
	verified_at?: string;
	created_at: string;
	updated_at: string;
}

export type QSOInsert = Omit<
	QSO,
	'id' | 'verification_code' | 'verified_at' | 'created_at' | 'updated_at'
>;
export type QSOUpdate = Partial<QSOInsert>;

export interface QSOFilter {
	callsign?: string;
	dateFrom?: string;
	dateTo?: string;
	band?: string;
	mode?: string;
	country?: string;
}

export interface QSOSort {
	field: keyof QSO;
	direction: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface QSOStats {
	totalQSOs: number;
	uniqueCallsigns: number;
	uniqueCountries: number;
	uniqueGrids: number;
}

export interface ValidationResult {
	valid: boolean;
	errors: Array<{ field: string; code: string }>;
}

export const BANDS = [
	'160m',
	'80m',
	'60m',
	'40m',
	'30m',
	'20m',
	'17m',
	'15m',
	'12m',
	'10m',
	'6m',
	'4m',
	'2m',
	'70cm',
	'23cm'
] as const;
export type Band = (typeof BANDS)[number];

export const MODES = [
	'CW',
	'SSB',
	'FM',
	'AM',
	'FT8',
	'FT4',
	'RTTY',
	'PSK31',
	'JT65',
	'JS8',
	'SSTV',
	'DV',
	'DIGITAL'
] as const;
export type Mode = (typeof MODES)[number];

export const CONTINENTS = ['NA', 'SA', 'EU', 'AF', 'AS', 'OC'] as const;
export type Continent = (typeof CONTINENTS)[number];

export const ADIF_QSL_STATUS = ['Y', 'N', 'R', 'Q'] as const;
export type ADIFQSLStatus = (typeof ADIF_QSL_STATUS)[number];
