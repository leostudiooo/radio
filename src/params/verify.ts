import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) =>
	/^[0-9A-Z]{8}$/i.test(param) || /^[0-9A-Z]{4}-[0-9A-Z]{4}$/i.test(param);
