import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	],
	server: {
		proxy: {
			'/api/v1/search': {
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			'/api/v1/brands': {
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			'/api/v1/filters': {
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			'/api/v1/models': {
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			'/api/v1/tires': {
				target: 'http://localhost:8000',
				changeOrigin: true
			},
			'/api/v1': {
				target: 'http://localhost:3001',
				changeOrigin: true
			},
			'/uploads': {
				target: 'http://localhost:8000',
				changeOrigin: true
			}
		}
	},
	test: {
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
			}
		]
	}
});
