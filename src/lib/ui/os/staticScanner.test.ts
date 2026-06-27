import { describe, expect, it } from 'vitest';
import { createStaticFSEntries } from './staticScanner';

describe('createStaticFSEntries', () => {
	it('maps file paths to StaticFSEntry objects sorted alphabetically', () => {
		const entries = createStaticFSEntries(
			['src/lib/ui/os/fs/etc/motd', 'src/lib/ui/os/fs/etc/profile'],
			'src/lib/ui/os/fs'
		);

		expect(entries).toEqual([{ path: '/etc/motd' }, { path: '/etc/profile' }]);
	});

	it('handles nested directories beyond one level', () => {
		const entries = createStaticFSEntries(['src/lib/ui/os/fs/var/log/syslog'], 'src/lib/ui/os/fs');

		expect(entries).toEqual([{ path: '/var/log/syslog' }]);
	});

	it('normalizes Windows backslashes to posix forward slashes', () => {
		const entries = createStaticFSEntries(
			['src\\lib\\ui\\os\\fs\\etc\\motd'],
			'src\\lib\\ui\\os\\fs'
		);

		expect(entries).toEqual([{ path: '/etc/motd' }]);
	});

	it('includes files without extensions (unlike routeScanner which filters for .svelte)', () => {
		const entries = createStaticFSEntries(
			['src/lib/ui/os/fs/etc/motd', 'src/lib/ui/os/fs/etc/profile'],
			'src/lib/ui/os/fs'
		);

		expect(entries).toHaveLength(2);
	});

	it('returns empty array for empty input', () => {
		const entries = createStaticFSEntries([], 'src/lib/ui/os/fs');

		expect(entries).toEqual([]);
	});

	it('sorts entries by path', () => {
		const entries = createStaticFSEntries(
			['src/lib/ui/os/fs/zzz/last', 'src/lib/ui/os/fs/aaa/first', 'src/lib/ui/os/fs/etc/motd'],
			'src/lib/ui/os/fs'
		);

		expect(entries).toEqual([{ path: '/aaa/first' }, { path: '/etc/motd' }, { path: '/zzz/last' }]);
	});
});
