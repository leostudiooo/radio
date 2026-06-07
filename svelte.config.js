import adapter from '@sveltejs/adapter-static';
import { fileURLToPath } from 'node:url';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({ fallback: 'index.html' }),
		alias: {
			'@wterm/dom/css': fileURLToPath(
				new URL('./vendors/wterm/packages/@wterm/dom/src/terminal.css', import.meta.url)
			),
			'@wterm/dom': fileURLToPath(
				new URL('./vendors/wterm/packages/@wterm/dom/src/index.ts', import.meta.url)
			),
			'@wterm/core': fileURLToPath(
				new URL('./vendors/wterm/packages/@wterm/core/src/index.ts', import.meta.url)
			)
		}
	}
};

export default config;
