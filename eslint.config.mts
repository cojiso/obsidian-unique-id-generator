// eslint-plugin-obsidianmd の recommended は、community directory の自動レビューが使う設定の土台。
// フォーマットと import の並びは Biome に任せる。
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
					// どの tsconfig にも入らない設定ファイルとスクリプトは、Node と Bun の型を持つ tsconfig.tools.json で読む。
					allowDefaultProject: ['eslint.config.mts', 'scripts/*.ts'],
					defaultProject: 'tsconfig.tools.json',
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
])
