import type { Equipment } from '$lib/logic/types/equipment';
import type { QSO } from '$lib/logic/types/qso';
import { basename, dirname, normalizeAbsolutePath, resolvePath, uniqueSorted } from './path';
import {
	equipmentAlias,
	findEquipmentIdByAlias,
	findQSOIdByAlias,
	isUuidLike,
	qsoAlias
} from './alias';
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

function recordStemFromPath(path: string, root: '/qso' | '/equipment'): string | null {
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

		const qsoStem = recordStemFromPath(target, '/qso');
		if (qsoStem) return this.readQSO(qsoStem);

		const equipmentStem = recordStemFromPath(target, '/equipment');
		if (equipmentStem) return this.readEquipment(equipmentStem);

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
		return result.data.slice(0, PAGE_SIZE).map((qso: QSO) => qsoAlias(qso));
	}

	private async equipmentRecordNames(): Promise<string[]> {
		const items = await this.adapters.equipment.list();
		return items.slice(0, PAGE_SIZE).map((item: Equipment) => equipmentAlias(item));
	}

	private async readQSO(stem: string): Promise<string> {
		const id = isUuidLike(stem)
			? stem
			: findQSOIdByAlias((await this.adapters.qso.list()).data, stem);

		if (!id) throw new Error(`/qso/${stem}.json: no such file`);
		const qso = await this.adapters.qso.get(id);
		if (!qso) throw new Error(`/qso/${stem}.json: no such file`);

		return formatJSON(qso);
	}

	private async readEquipment(stem: string): Promise<string> {
		const items = await this.adapters.equipment.list();
		const id = isUuidLike(stem) ? stem : findEquipmentIdByAlias(items, stem);

		if (!id) throw new Error(`/equipment/${stem}.json: no such file`);
		const item = await this.adapters.equipment.get(id);
		if (!item) throw new Error(`/equipment/${stem}.json: no such file`);

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
