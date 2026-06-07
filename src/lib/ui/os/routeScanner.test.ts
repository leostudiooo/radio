import { describe, expect, it } from 'vitest';
import { createSiteFSEntries } from './routeScanner';

describe('createSiteFSEntries', () => {
	it('ignores non-page route files and sorts static entries', () => {
		const entries = createSiteFSEntries([
			'src/routes/settings/+page.svelte',
			'src/routes/+layout.svelte',
			'src/routes/auth/callback/+page.svelte',
			'src/routes/blog/+error.svelte',
			'src/routes/blog/+layout.svelte',
			'src/routes/blog/+page.svelte',
			'src/routes/qso/new/+page.svelte',
			'src/routes/+page.svelte'
		]);

		expect(entries).toEqual([
			{ path: '/', route: '/', kind: 'page', params: [] },
			{ path: '/auth/callback', route: '/auth/callback', kind: 'page', params: [] },
			{ path: '/blog', route: '/blog', kind: 'page', params: [] },
			{ path: '/qso/new', route: '/qso/new', kind: 'page', params: [] },
			{ path: '/settings', route: '/settings', kind: 'page', params: [] }
		]);
	});

	it('extracts dynamic route params and marks dynamic entries', () => {
		const entries = createSiteFSEntries([
			'src/routes/static/+page.svelte',
			'src/routes/qso/[callsign]/[band]/+layout.svelte',
			'src/routes/qso/[callsign]/[band]/+page.svelte',
			'src/routes/users/[id]/+page.svelte'
		]);

		expect(entries).toEqual([
			{
				path: '/qso/[callsign]/[band]',
				route: '/qso/[callsign]/[band]',
				kind: 'dynamic',
				params: ['callsign', 'band']
			},
			{ path: '/static', route: '/static', kind: 'page', params: [] },
			{
				path: '/users/[id]',
				route: '/users/[id]',
				kind: 'dynamic',
				params: ['id']
			}
		]);
	});
});
