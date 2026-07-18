import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('settingsStore theme', () => {
	let systemDark = false;
	let themeChangeListener: (() => void) | undefined;

	beforeEach(() => {
		vi.resetModules();
		const storage = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			clear: () => storage.clear(),
			getItem: (key: string) => storage.get(key) ?? null,
			removeItem: (key: string) => storage.delete(key),
			setItem: (key: string, value: string) => storage.set(key, value)
		});
		document.documentElement.removeAttribute('data-theme');
		document.documentElement.removeAttribute('style');
		document.head.innerHTML = '<meta name="theme-color" content="#0a0a0a">';
		systemDark = false;
		themeChangeListener = undefined;

		vi.stubGlobal(
			'matchMedia',
			vi.fn((query: string) => ({
				get matches() {
					return systemDark;
				},
				media: query,
				onchange: null,
				addEventListener: (_type: string, listener: () => void) => {
					themeChangeListener = listener;
				},
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn()
			}))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('follows the light system theme by default', async () => {
		const { settingsStore } = await import('./settings.svelte');

		expect(settingsStore.themePreference).toBe('system');
		expect(settingsStore.resolvedTheme).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');
		expect(document.documentElement.style.colorScheme).toBe('light');
	});

	it('persists an explicit dark theme and updates browser chrome', async () => {
		const { settingsStore } = await import('./settings.svelte');

		settingsStore.setThemePreference('dark');

		expect(settingsStore.themePreference).toBe('dark');
		expect(settingsStore.resolvedTheme).toBe('dark');
		expect(localStorage.getItem('radio.theme')).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
			'#0a0a0a'
		);
	});

	it('reacts to system theme changes only while following the system', async () => {
		const { settingsStore } = await import('./settings.svelte');

		systemDark = true;
		themeChangeListener?.();
		expect(settingsStore.resolvedTheme).toBe('dark');

		settingsStore.setThemePreference('light');
		systemDark = false;
		themeChangeListener?.();
		expect(settingsStore.resolvedTheme).toBe('light');
	});
});
