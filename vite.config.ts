import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin, ViteDevServer } from 'vite';
import { createStaticFSEntries, collectStaticFiles } from './src/lib/ui/os/staticScanner';
import { createSiteFSEntries } from './src/lib/ui/os/routeScanner';

const STATION_SITE_FS_VIRTUAL_ID = 'virtual:station-site-fs';
const RESOLVED_STATION_SITE_FS_VIRTUAL_ID = '\0virtual:station-site-fs';
const STATION_STATIC_FS_VIRTUAL_ID = 'virtual:station-static-fs';
const RESOLVED_STATION_STATIC_FS_VIRTUAL_ID = '\0virtual:station-static-fs';

function toPosixPath(path: string): string {
	return path.replaceAll('\\', '/');
}

function isRouteSourceFile(file: string, routesRoot: string): boolean {
	const normalizedFile = toPosixPath(file);
	const normalizedRoot = toPosixPath(routesRoot).replace(/\/$/, '');

	return normalizedFile.startsWith(`${normalizedRoot}/`) && normalizedFile.endsWith('.svelte');
}

function isStaticSourceFile(file: string, staticRoot: string): boolean {
	const normalizedFile = toPosixPath(file);
	const normalizedRoot = toPosixPath(staticRoot).replace(/\/$/, '');

	return normalizedFile.startsWith(`${normalizedRoot}/`);
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

function createManifestCache<Entry>(
	collectFiles: () => string[],
	createEntries: (files: string[]) => Entry[]
) {
	let cachedFiles: string[] | null = null;
	let cachedEntries: Entry[] | null = null;

	function files() {
		cachedFiles ??= collectFiles();
		return cachedFiles;
	}

	function entries() {
		cachedEntries ??= createEntries(files());
		return cachedEntries;
	}

	function invalidate() {
		cachedFiles = null;
		cachedEntries = null;
	}

	return { files, entries, invalidate };
}

function stationSiteFsManifestPlugin(): Plugin {
	let routesRoot = '';
	let server: ViteDevServer | null = null;

	const cache = createManifestCache(
		() => collectRouteFiles(routesRoot),
		(files) => createSiteFSEntries(files, routesRoot)
	);

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

			const entries = cache.entries();
			for (const file of cache.files()) {
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

			cache.invalidate();
			const module = server.moduleGraph.getModuleById(RESOLVED_STATION_SITE_FS_VIRTUAL_ID);
			if (!module) return;

			server.moduleGraph.invalidateModule(module);
			return [module];
		}
	};
}

function stationStaticFsPlugin(): Plugin {
	let staticRoot = '';
	let server: ViteDevServer | null = null;

	const cache = createManifestCache(
		() => collectStaticFiles(staticRoot),
		(files) => createStaticFSEntries(files, staticRoot)
	);

	return {
		name: 'station-static-fs-manifest',
		enforce: 'pre',
		configResolved(config) {
			staticRoot = resolve(config.root, 'src/lib/ui/os/fs');
		},
		resolveId(id) {
			if (id === STATION_STATIC_FS_VIRTUAL_ID) {
				return RESOLVED_STATION_STATIC_FS_VIRTUAL_ID;
			}
		},
		load(id) {
			if (id !== RESOLVED_STATION_STATIC_FS_VIRTUAL_ID) return null;

			const entries = cache.entries();
			for (const file of cache.files()) {
				this.addWatchFile(file);
			}

			return `export default ${JSON.stringify(entries, null, '\t')};`;
		},
		configureServer(devServer) {
			server = devServer;
			devServer.watcher.add(staticRoot);

			// Serve static files at /vfs/*
			devServer.middlewares.use('/vfs', (req, res, next) => {
				if (!req.url) return next();

				const requestedPath = decodeURIComponent(req.url);
				const resolvedPath = resolve(staticRoot, `.${requestedPath}`);

				const relativePath = relative(staticRoot, resolvedPath);

				if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
					res.statusCode = 403;
					res.end('Forbidden');
					return;
				}

				try {
					const content = readFileSync(resolvedPath);
					res.setHeader('Content-Type', 'text/plain; charset=utf-8');
					res.end(content);
				} catch {
					next();
				}
			});
		},
		handleHotUpdate(ctx) {
			if (!server || !isStaticSourceFile(ctx.file, staticRoot)) return;

			cache.invalidate();
			const module = server.moduleGraph.getModuleById(RESOLVED_STATION_STATIC_FS_VIRTUAL_ID);
			if (!module) return;

			server.moduleGraph.invalidateModule(module);
			return [module];
		},
		generateBundle() {
			for (const file of cache.files()) {
				const relativePath = toPosixPath(file).slice(toPosixPath(staticRoot).length + 1);
				const content = readFileSync(file);
				this.emitFile({
					type: 'asset',
					fileName: `vfs/${relativePath}`,
					source: content
				});
			}
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), stationSiteFsManifestPlugin(), stationStaticFsPlugin(), sveltekit()],
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
