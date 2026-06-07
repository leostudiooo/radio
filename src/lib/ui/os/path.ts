function splitPath(path: string): string[] {
	return path.split('/').filter(Boolean);
}

export function normalizeAbsolutePath(path: string): string {
	const parts: string[] = [];

	for (const part of splitPath(path)) {
		if (part === '.') continue;
		if (part === '..') {
			parts.pop();
			continue;
		}
		parts.push(part);
	}

	return `/${parts.join('/')}`;
}

export function resolvePath(cwd: string, path = '.'): string {
	if (!path || path === '.') return normalizeAbsolutePath(cwd);
	if (path.startsWith('/')) return normalizeAbsolutePath(path);

	return normalizeAbsolutePath(`${cwd}/${path}`);
}

export function dirname(path: string): string {
	const normalized = normalizeAbsolutePath(path);
	if (normalized === '/') return '/';

	const parts = splitPath(normalized);
	parts.pop();

	return parts.length === 0 ? '/' : `/${parts.join('/')}`;
}

export function basename(path: string): string {
	const normalized = normalizeAbsolutePath(path);
	if (normalized === '/') return '/';

	const parts = splitPath(normalized);
	return parts[parts.length - 1] ?? '/';
}

export function routeForIndexPath(path: string): string | null {
	const normalized = normalizeAbsolutePath(path);
	if (normalized === '/index') return '/';
	if (!normalized.endsWith('/index')) return null;

	return normalized.slice(0, -'/index'.length) || '/';
}

export function uniqueSorted(values: string[]): string[] {
	return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}
