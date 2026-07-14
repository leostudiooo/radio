const DASH = '\u2014';

export type DateTimeFormatOptions = {
	useLocalTime?: boolean;
};

function timeZoneOption(useLocalTime: boolean): { timeZone?: string } {
	return useLocalTime ? {} : { timeZone: 'UTC' };
}

export function formatDate(value: unknown, options: DateTimeFormatOptions = {}): string {
	try {
		const { useLocalTime = true } = options;
		const iso = String(value ?? '');
		if (!iso) return DASH;
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			...timeZoneOption(useLocalTime)
		});
	} catch {
		return DASH;
	}
}

export function formatTime(value: unknown, options: DateTimeFormatOptions = {}): string {
	try {
		const { useLocalTime = true } = options;
		const iso = String(value ?? '');
		if (!iso) return DASH;
		return new Date(iso).toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			...timeZoneOption(useLocalTime)
		});
	} catch {
		return DASH;
	}
}
