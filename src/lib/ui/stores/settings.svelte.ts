export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const TIME_STORAGE_KEY = 'radio.useLocalTime';
const THEME_STORAGE_KEY = 'radio.theme';
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

function getStoredTimeValue(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(TIME_STORAGE_KEY) === 'true';
}

function getStoredThemePreference(): ThemePreference {
	if (typeof localStorage === 'undefined') return 'system';
	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function systemTheme(): ResolvedTheme {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
	return window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
	return preference === 'system' ? systemTheme() : preference;
}

function applyTheme(theme: ResolvedTheme) {
	if (typeof document === 'undefined') return;
	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme;
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#fafbfc');
}

function createSettingsStore() {
	let useLocalTime = $state<boolean>(getStoredTimeValue());
	const initialThemePreference = getStoredThemePreference();
	const initialResolvedTheme = resolveTheme(initialThemePreference);
	let themePreference = $state<ThemePreference>(initialThemePreference);
	let resolvedTheme = $state<ResolvedTheme>(initialResolvedTheme);

	function setUseLocalTime(val: boolean) {
		useLocalTime = val;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(TIME_STORAGE_KEY, String(val));
		}
	}

	function toggleUseLocalTime() {
		setUseLocalTime(!useLocalTime);
	}

	function setThemePreference(preference: ThemePreference) {
		themePreference = preference;
		resolvedTheme = resolveTheme(preference);
		applyTheme(resolvedTheme);
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(THEME_STORAGE_KEY, preference);
		}
	}

	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
		window.matchMedia(DARK_MODE_QUERY).addEventListener('change', () => {
			if (themePreference !== 'system') return;
			resolvedTheme = systemTheme();
			applyTheme(resolvedTheme);
		});
	}

	applyTheme(initialResolvedTheme);

	return {
		get useLocalTime() {
			return useLocalTime;
		},
		get themePreference() {
			return themePreference;
		},
		get resolvedTheme() {
			return resolvedTheme;
		},
		setUseLocalTime,
		toggleUseLocalTime,
		setThemePreference
	};
}

export const settingsStore = createSettingsStore();
