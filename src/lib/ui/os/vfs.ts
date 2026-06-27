import type { Equipment } from '$lib/logic/types/equipment';
import type { QSO } from '$lib/logic/types/qso';
import { basename, dirname, normalizeAbsolutePath, resolvePath, uniqueSorted } from './path';
import { formatJSON, formatOperatorInfo } from './format';
import type { SiteFSEntry, StaticFSEntry, StationOSAdapters, VFSListEntry } from './types';

const PAGE_SIZE = 25;

function routeNodePath(route: string): string {
	if (route === '/') return '/';
	return normalizeAbsolutePath(route);
}

function routeIndexPath(route: string): string {
	if (route === '/') return '/index';
	return normalizeAbsolutePath(`${route}/index`);
}

function recordIdFromPath(path: string, root: '/qso' | '/equipment'): string | null {
	const normalized = normalizeAbsolutePath(path);
	const prefix = `${root}/`;

	if (!normalized.startsWith(prefix) || !normalized.endsWith('.json')) return null;

	const rest = normalized.slice(prefix.length);
	if (rest.includes('/')) return null;

	return rest.slice(0, -'.json'.length);
}

function routeDescription(path: string, route: string): string {
	return formatJSON({
		type: 'route',
		path,
		route
	});
}

function normalizeLineEndings(content: string): string {
	return content
		.replace(/\r\n/g, '\n')
		.replace(/\n/g, '\r\n')
		.replace(/(?:\r\n)+$/, '');
}

export class StationVFS {
	private readonly routes = new Map<string, SiteFSEntry>();
	private readonly visibleRoutes: SiteFSEntry[];
	private readonly staticEntryPaths: Set<string>;

	constructor(
		private readonly siteEntries: SiteFSEntry[],
		private readonly staticEntries: StaticFSEntry[],
		private readonly adapters: StationOSAdapters
	) {
		this.visibleRoutes = siteEntries.filter((entry) => entry.kind === 'page');
		this.staticEntryPaths = new Set(
			staticEntries.map((entry) => normalizeAbsolutePath(entry.path))
		);

		for (const entry of this.visibleRoutes) {
			this.routes.set(routeNodePath(entry.path), entry);
			this.routes.set(routeIndexPath(entry.path), entry);
		}
	}

	async list(path: string, cwd: string): Promise<VFSListEntry[]> {
		const target = resolvePath(cwd, path);

		if (!(await this.isDirectory(target))) {
			throw new Error(`${target}: not a directory`);
		}

		const names = [
			...this.staticChildNames(target),
			...(target === '/qso' ? await this.qsoRecordNames() : []),
			...(target === '/equipment' ? await this.equipmentRecordNames() : [])
		];

		return uniqueSorted(names).map((name) => ({
			name,
			kind: this.kindForChild(target, name)
		}));
	}

	async read(path: string, cwd: string): Promise<string> {
		const target = resolvePath(cwd, path);

		if (target === '/operator_info.json') {
			return formatOperatorInfo(this.adapters.station.operatorInfo());
		}

		if (this.staticEntryPaths.has(target)) {
			const content = await this.adapters.fs.read(target);
			return normalizeLineEndings(content);
		}

		const qsoId = recordIdFromPath(target, '/qso');
		if (qsoId) return this.readQSO(qsoId);

		const equipmentId = recordIdFromPath(target, '/equipment');
		if (equipmentId) return this.readEquipment(equipmentId);

		const route = this.routes.get(target);
		if (route) {
			return routeDescription(target, route.route);
		}

		throw new Error(`${target}: no such file`);
	}

	async isDirectory(path: string): Promise<boolean> {
		const target = normalizeAbsolutePath(path);
		if (target === '/qso' || target === '/equipment') return true;
		if (this.routes.has(target) && !target.endsWith('/index')) return true;

		return this.staticChildNames(target).length > 0;
	}

	routeFor(path: string): string | null {
		const target = normalizeAbsolutePath(path);
		const route = this.routes.get(target);
		if (!route || route.kind !== 'page') return null;

		return route.route;
	}

	private staticChildNames(path: string): string[] {
		const target = normalizeAbsolutePath(path);
		const names: string[] = [];

		if (target === '/') {
			names.push('operator_info.json', 'etc', 'index');
		}

		for (const staticPath of this.staticEntryPaths) {
			const relative = this.relativeTo(staticPath, target);
			if (relative) {
				const firstSegment = relative.split('/')[0];
				if (firstSegment) names.push(firstSegment);
			}
		}

		for (const route of this.visibleRoutes) {
			const routePath = routeNodePath(route.path);
			if (routePath === target) {
				names.push('index');
				continue;
			}

			if (dirname(routePath) === target) {
				names.push(basename(routePath));
			}
		}

		return names;
	}

	private relativeTo(staticPath: string, parent: string): string | null {
		if (staticPath === parent) return null;
		if (!staticPath.startsWith(parent === '/' ? '/' : `${parent}/`)) return null;

		return staticPath.slice(parent === '/' ? 1 : parent.length + 1);
	}

	private kindForChild(parent: string, name: string): VFSListEntry['kind'] {
		const child = normalizeAbsolutePath(parent === '/' ? `/${name}` : `${parent}/${name}`);

		if (child === '/operator_info.json' || this.staticEntryPaths.has(child)) return 'file';
		if (child === '/index' || this.routes.has(child) || this.routes.has(routeIndexPath(child))) {
			return 'route';
		}

		return 'dir';
	}

	private async qsoRecordNames(): Promise<string[]> {
		const result = await this.adapters.qso.list();
		return result.data.slice(0, PAGE_SIZE).map((qso: QSO) => `${qso.id}.json`);
	}

	private async equipmentRecordNames(): Promise<string[]> {
		const items = await this.adapters.equipment.list();
		return items.slice(0, PAGE_SIZE).map((item: Equipment) => `${item.id}.json`);
	}

	private async readQSO(id: string): Promise<string> {
		const qso = await this.adapters.qso.get(id);
		if (!qso) throw new Error(`/qso/${id}.json: no such file`);

		return formatJSON(qso);
	}

	private async readEquipment(id: string): Promise<string> {
		const item = await this.adapters.equipment.get(id);
		if (!item) throw new Error(`/equipment/${id}.json: no such file`);

		return formatJSON(item);
	}
}

export function createStationVFS(
	siteEntries: SiteFSEntry[],
	staticEntries: StaticFSEntry[],
	adapters: StationOSAdapters
) {
	return new StationVFS(siteEntries, staticEntries, adapters);
}
