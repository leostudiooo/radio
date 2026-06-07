import type { SiteFSEntry } from './types';

function toPosixPath(path: string): string {
	return path.replaceAll('\\', '/');
}

function trimRouteRoot(file: string, routesRoot: string): string {
	const normalizedFile = toPosixPath(file);
	const normalizedRoot = toPosixPath(routesRoot).replace(/\/$/, '');

	if (normalizedFile.startsWith(`${normalizedRoot}/`)) {
		return normalizedFile.slice(normalizedRoot.length + 1);
	}

	return normalizedFile;
}

function routePathFromPageFile(file: string, routesRoot: string): string | null {
	const relative = trimRouteRoot(file, routesRoot);

	if (!relative.endsWith('/+page.svelte') && relative !== '+page.svelte') {
		return null;
	}

	const directory = relative.replace(/\/?\+page\.svelte$/, '');
	if (!directory) return '/';

	return `/${directory}`;
}

function paramsFromRoute(route: string): string[] {
	return Array.from(route.matchAll(/\[([^\]]+)\]/g), (match) => match[1] ?? '');
}

export function createSiteFSEntries(files: string[], routesRoot = 'src/routes'): SiteFSEntry[] {
	return files
		.map((file) => routePathFromPageFile(file, routesRoot))
		.filter((route): route is string => route !== null)
		.map((route) => {
			const params = paramsFromRoute(route);
			const kind: SiteFSEntry['kind'] = params.length > 0 ? 'dynamic' : 'page';

			return {
				path: route,
				route,
				kind,
				params
			};
		})
		.sort((a, b) => a.path.localeCompare(b.path));
}
