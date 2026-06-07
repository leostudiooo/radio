import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		fs: {
			allow: [fileURLToPath(new URL('./vendors', import.meta.url))]
		}
	},
	resolve: {
		alias: [
			{
				find: '@wterm/dom/css',
				replacement: fileURLToPath(
					new URL('./vendors/wterm/packages/@wterm/dom/src/terminal.css', import.meta.url)
				)
			},
			{
				find: '@wterm/dom',
				replacement: fileURLToPath(
					new URL('./vendors/wterm/packages/@wterm/dom/src/index.ts', import.meta.url)
				)
			},
			{
				find: '@wterm/core',
				replacement: fileURLToPath(
					new URL('./vendors/wterm/packages/@wterm/core/src/index.ts', import.meta.url)
				)
			}
		]
	},
	test: {
		passWithNoTests: true,
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'jsdom',
					include: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
