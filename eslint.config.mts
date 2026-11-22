// The recommended config of eslint-plugin-obsidianmd is the base of the config used by the automated review for the community directory.
// Biome handles formatting and import order.
import { defineConfig, globalIgnores } from 'eslint/config'
import obsidianmd from 'eslint-plugin-obsidianmd'

export default defineConfig([
	globalIgnores([
		'node_modules',
		'docs',
		'test-vault',
		'main.js',
		'esbuild.config.mjs',
	]),
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					// Config files and scripts that no tsconfig includes are read with tsconfig.tools.json, which has the Node and Bun types.
					allowDefaultProject: ['eslint.config.mts', 'scripts/*.ts'],
					defaultProject: 'tsconfig.tools.json',
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
])
