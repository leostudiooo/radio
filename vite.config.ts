import tailwindcss from '@tailwindcss/vite';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin, ViteDevServer } from 'vite';
import { createSiteFSEntries } from './src/lib/ui/os/routeScanner';

const STATION_SITE_FS_VIRTUAL_ID = 'virtual:station-site-fs';
const RESOLVED_STATION_SITE_FS_VIRTUAL_ID = '\0virtual:station-site-fs';

function toPosixPath(path: string): string {
	return path.replaceAll('\\', '/');
}

function isRouteSourceFile(file: string, routesRoot: string): boolean {
	const normalizedFile = toPosixPath(file);
	const normalizedRoot = toPosixPath(routesRoot).replace(/\/$/, '');

	return normalizedFile.startsWith(`${normalizedRoot}/`) && normalizedFile.endsWith('.svelte');
}

function collectRouteFiles(rootDir: string): string[] {
	const files: string[] = [];

	for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
		const fullPath = join(rootDir, entry.name);

		if (entry.isDirectory()) {
			files.push(...collectRouteFiles(fullPath));
			continue;
		}

		if (entry.isFile() && entry.name.endsWith('.svelte')) {
			files.push(fullPath);
		}
	}

	return files;
}

function stationSiteFsManifestPlugin(): Plugin {
	let routesRoot = '';
	let server: ViteDevServer | null = null;

	const loadEntries = () => {
		const files = collectRouteFiles(routesRoot);

		return createSiteFSEntries(files, routesRoot);
	};

	return {
		name: 'station-site-fs-manifest',
		enforce: 'pre',
		configResolved(config) {
			routesRoot = resolve(config.root, 'src/routes');
		},
		resolveId(id) {
			if (id === STATION_SITE_FS_VIRTUAL_ID) {
				return RESOLVED_STATION_SITE_FS_VIRTUAL_ID;
			}
		},
		load(id) {
			if (id !== RESOLVED_STATION_SITE_FS_VIRTUAL_ID) return null;

			const entries = loadEntries();
			for (const file of collectRouteFiles(routesRoot)) {
				this.addWatchFile(file);
			}

			return `export default ${JSON.stringify(entries, null, '\t')};`;
		},
		configureServer(devServer) {
			server = devServer;
			devServer.watcher.add(routesRoot);
		},
		handleHotUpdate(ctx) {
			if (!server || !isRouteSourceFile(ctx.file, routesRoot)) return;

			const module = server.moduleGraph.getModuleById(RESOLVED_STATION_SITE_FS_VIRTUAL_ID);
			if (!module) return;

			server.moduleGraph.invalidateModule(module);
			return [module];
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), stationSiteFsManifestPlugin(), sveltekit()],
	server: {
		fs: {
			allow: [fileURLToPath(new URL('./vendors', import.meta.url))]
		}
	},
	resolve: {
		alias: [
			{
				find: '@wterm/dom/css',
				replacement: fileURLToPath(
					new URL('./vendors/wterm/packages/@wterm/dom/src/terminal.css', import.meta.url)
				)
			},
			{
				find: '@wterm/dom',
				replacement: fileURLToPath(
					new URL('./vendors/wterm/packages/@wterm/dom/src/index.ts', import.meta.url)
				)
			},
			{
				find: '@wterm/core',
				replacement: fileURLToPath(
					new URL('./vendors/wterm/packages/@wterm/core/src/index.ts', import.meta.url)
				)
			}
		]
	},
	test: {
		passWithNoTests: true,
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'jsdom',
					include: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
