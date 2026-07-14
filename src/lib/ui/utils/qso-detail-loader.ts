import type { QSO } from '$lib/logic/types/qso';

export type QsoDetailLoadPatch = Partial<{
	qso: QSO | null;
	loading: boolean;
	notFound: boolean;
	verificationCode: string | null;
	confirmationUrl: string;
}>;

export type QsoDetailLoadDeps = {
	getQSOById: (id: string) => Promise<QSO | null>;
	getVerificationCode: (id: string) => Promise<string | null>;
	getConfirmationOrigin: () => string;
};

export function createQsoDetailLoader(
	deps: QsoDetailLoadDeps,
	apply: (patch: QsoDetailLoadPatch) => void
) {
	let requestId = 0;

	async function load(id: string, loadSecret: boolean) {
		const currentRequestId = ++requestId;
		apply({ loading: true, notFound: false });

		try {
			const result = await deps.getQSOById(id);
			if (currentRequestId !== requestId) return;

			if (!result) {
				apply({ qso: null, verificationCode: null, notFound: true, loading: false });
				return;
			}

			const verificationCode = loadSecret ? await deps.getVerificationCode(id) : null;
			if (currentRequestId !== requestId) return;

			apply({
				qso: result,
				verificationCode,
				confirmationUrl: `${deps.getConfirmationOrigin()}/qso/confirm`,
				notFound: false,
				loading: false
			});
		} catch {
			if (currentRequestId !== requestId) return;
			apply({ qso: null, verificationCode: null, notFound: true, loading: false });
		}
	}

	return { load };
}
