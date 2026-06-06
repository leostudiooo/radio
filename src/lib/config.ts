export const SITE_CONFIG = {
	callsign: 'BA4VUN',
	siteTitle: 'BA4VUN QSO Log',
	get pageTitleSuffix() {
		return ` - ${this.callsign}`;
	}
} as const;
