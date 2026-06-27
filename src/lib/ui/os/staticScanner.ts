import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { StaticFSEntry } from './types';

function toPosixPath(path: string): string {
	return path.replaceAll('\\', '/');
}

function trimFsRoot(file: string, fsRoot: string): string {
	const normalizedFile = toPosixPath(file);
	const normalizedRoot = toPosixPath(fsRoot).replace(/\/$/, '');

	if (normalizedFile.startsWith(`${normalizedRoot}/`)) {
		return normalizedFile.slice(normalizedRoot.length + 1);
	}

	return normalizedFile;
}

export function collectStaticFiles(rootDir: string): string[] {
	const files: string[] = [];

	function scan(dir: string) {
		const entries = readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				scan(fullPath);
			} else if (entry.isFile()) {
				files.push(fullPath);
			}
		}
	}

	scan(rootDir);

	return files;
}

export function createStaticFSEntries(files: string[], fsRoot: string): StaticFSEntry[] {
	return files
		.map((file) => ({
			path: `/${trimFsRoot(file, fsRoot)}`
		}))
		.sort((a, b) => a.path.localeCompare(b.path));
}
