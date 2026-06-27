import type { Equipment } from '$lib/logic/types/equipment';
import type { PaginatedResult, QSO } from '$lib/logic/types/qso';

export type AuthRole = 'loading' | 'guest' | 'user' | 'admin';

export interface AuthStatus {
	loading: boolean;
	isAuthenticated: boolean;
	isAdmin: boolean;
	role: AuthRole;
	callsign: string | null;
	email?: string | null;
	userId?: string | null;
}

export interface AuthCommandResult {
	success: boolean;
	message?: string;
	error?: string;
	errorCode?: string;
}

export interface SiteFSEntry {
	path: string;
	route: string;
	kind: 'page' | 'dynamic';
	params: string[];
}

export interface StaticFSEntry {
	path: string;
}

export interface StationOSAdapters {
	emit: (text: string) => void;
	sleep: (ms: number) => Promise<void>;
	auth: {
		status: () => AuthStatus;
		loginWithPasskey: () => Promise<AuthCommandResult>;
		loginWithMagicLink: (email: string) => Promise<AuthCommandResult>;
		logout: () => Promise<void> | void;
	};
	router: {
		goto: (path: string) => Promise<void> | void;
	};
	qso: {
		list: () => Promise<PaginatedResult<QSO>>;
		get: (id: string) => Promise<QSO | null>;
		navigateList: () => Promise<void> | void;
		navigateView: (id: string) => Promise<void> | void;
		navigateAdd: () => Promise<void> | void;
		navigateEdit: (id: string) => Promise<void> | void;
	};
	equipment: {
		list: () => Promise<Equipment[]>;
		get: (id: string) => Promise<Equipment | null>;
		activate: (id: string) => Promise<Equipment>;
		deactivate: (id: string) => Promise<Equipment>;
		navigateList: () => Promise<void> | void;
		navigateView: (id: string) => Promise<void> | void;
		navigateAdd: () => Promise<void> | void;
		navigateEdit: (id: string) => Promise<void> | void;
	};
	station: {
		operatorInfo: () => Record<string, string>;
	};
	fs: {
		read: (path: string) => Promise<string>;
	};
}

export interface CompletionResult {
	candidates: string[];
	completedLine: string;
	suffix: string;
}

export interface StationOSState {
	cwd: string;
	bootComplete: boolean;
}

export interface StationOS {
	boot: (options?: { instant?: boolean }) => Promise<void>;
	skipBoot: () => void;
	exec: (line: string) => Promise<void>;
	complete: (line: string) => Promise<CompletionResult>;
	getPrompt: () => string;
	getState: () => StationOSState;
}

export interface StationOSOptions {
	adapters: StationOSAdapters;
	siteEntries: SiteFSEntry[];
	staticEntries: StaticFSEntry[];
}

export type VFSNodeKind = 'dir' | 'file' | 'route';

export interface VFSListEntry {
	name: string;
	kind: VFSNodeKind;
}
