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

const EQUIPMENT_ALIASED_ROOTS = new Set(['/equipment', '/dev']);

function routeNodePath(route: string): string {
	if (route === '/') return '/';
	return normalizeAbsolutePath(route);
}

function childNameUnder(target: string, root: string): string | null {
	const prefix = `${root}/`;
	if (!target.startsWith(prefix)) return null;
	const rest = target.slice(prefix.length);
	if (!rest || rest.includes('/')) return null;
	return rest;
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
			...(EQUIPMENT_ALIASED_ROOTS.has(target) ? await this.equipmentRecordNames() : [])
		];

		return uniqueSorted(names).map((name) => ({
			name,
			kind: this.kindForChild(target, name)
		}));
	}

	async read(path: string, cwd: string): Promise<string> {
		const target = resolvePath(cwd, path);

		if (await this.isDirectory(target)) {
			throw new Error(`${target}: is a directory`);
		}

		if (target === '/operator_info.json') {
			return formatOperatorInfo(this.adapters.station.operatorInfo());
		}

		if (this.staticEntryPaths.has(target)) {
			const content = await this.adapters.fs.read(target);
			return normalizeLineEndings(content);
		}

		const qsoStem = childNameUnder(target, '/qso');
		if (qsoStem) {
			const content = await this.readQSO(qsoStem);
			if (content !== null) return content;
		}

		for (const root of EQUIPMENT_ALIASED_ROOTS) {
			const stem = childNameUnder(target, root);
			if (stem) {
				const content = await this.readEquipment(stem);
				if (content !== null) return content;
			}
		}

		throw new Error(`${target}: no such file`);
	}

	async isDirectory(path: string): Promise<boolean> {
		const target = normalizeAbsolutePath(path);
		if (target === '/qso' || EQUIPMENT_ALIASED_ROOTS.has(target)) return true;
		if (this.routes.has(target)) return true;

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
			names.push('operator_info.json', 'etc', 'dev');
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
			if (routePath === target) continue;
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
		if (this.routes.has(child)) return 'route';
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

	private async readQSO(stem: string): Promise<string | null> {
		const id = isUuidLike(stem)
			? stem
			: findQSOIdByAlias((await this.adapters.qso.list()).data, stem);
		if (!id) return null;
		const qso = await this.adapters.qso.get(id);
		if (!qso) return null;
		return formatJSON(qso);
	}

	private async readEquipment(stem: string): Promise<string | null> {
		const items = await this.adapters.equipment.list();
		const id = isUuidLike(stem) ? stem : findEquipmentIdByAlias(items, stem);
		if (!id) return null;
		const item = await this.adapters.equipment.get(id);
		if (!item) return null;
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
