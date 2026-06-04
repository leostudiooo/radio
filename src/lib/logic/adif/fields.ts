export const ADIF_TO_DB_MAP: Record<string, string> = {
	CALL: 'callsign',
	BAND: 'band',
	FREQ: 'freq',
	MODE: 'mode',
	SUBMODE: 'submode',
	RST_SENT: 'rst_sent',
	RST_RCVD: 'rst_rcvd',
	TX_PWR: 'tx_pwr',
	NAME: 'name',
	QTH: 'qth',
	GRIDSQUARE: 'grid_square',
	COMMENT: 'comment',
	DXCC: 'dxcc',
	COUNTRY: 'country',
	CQZ: 'cq_zone',
	ITUZ: 'itu_zone',
	CONT: 'cont',
	QSL_SENT: 'qsl_sent',
	QSL_SENT_VIA: 'qsl_sent_via',
	QSL_RCVD: 'qsl_rcvd',
	QSL_RCVD_VIA: 'qsl_rcvd_via',
	LOTW_QSL_SENT: 'lotw_qsl_sent',
	LOTW_QSL_RCVD: 'lotw_qsl_rcvd',
	EQSL_QSL_SENT: 'eqsl_qsl_sent',
	EQSL_QSL_RCVD: 'eqsl_qsl_rcvd',
	PROP_MODE: 'prop_mode',
	SAT_NAME: 'sat_name',
	ANT_AZ: 'ant_az',
	ANT_EL: 'ant_el',
	DISTANCE: 'distance',
	OPERATOR: 'operator',
	LAT: 'latitude',
	LON: 'longitude'
};

export const DB_TO_ADIF_MAP: Record<string, string> = Object.fromEntries(
	Object.entries(ADIF_TO_DB_MAP).map(([k, v]) => [v, k])
);
