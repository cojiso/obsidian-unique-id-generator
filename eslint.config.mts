// eslint-plugin-obsidianmd の recommended は、community directory の自動レビューが使う設定の土台。
// フォーマットと import の並びは Biome に任せる。
import { defineConfig, globalIgnores } from 'eslint/config'
import obsidianmd from 'eslint-plugin-obsidianmd'

export default defineConfig([
	globalIgnores(['node_modules', 'docs', 'main.js', 'esbuild.config.mjs']),
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'scripts/*.ts'],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
])
