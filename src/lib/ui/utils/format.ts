const DASH = '\u2014';

export function formatDate(value: unknown): string {
	try {
		const iso = String(value ?? '');
		if (!iso) return DASH;
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	} catch {
		return DASH;
	}
}

export function formatTime(value: unknown): string {
	try {
		const iso = String(value ?? '');
		if (!iso) return DASH;
		return new Date(iso).toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit'
		});
	} catch {
		return DASH;
	}
}
