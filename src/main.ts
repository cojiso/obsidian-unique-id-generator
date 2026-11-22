import { type Editor, Notice, Plugin } from 'obsidian'
import { createApi, type UniqueIdApi } from './api'
import { UniqueIdGeneratorSettingTab } from './settings'
import { readSettings, type UniqueIdGeneratorSettings } from './settings-data'

export default class UniqueIdGeneratorPlugin extends Plugin {
	settings!: UniqueIdGeneratorSettings
	// スクリプトからは app.plugins.plugins['unique-id-generator'].api で呼ぶ。
	api!: UniqueIdApi

	async onload() {
		this.settings = readSettings(await this.loadData())
		this.api = createApi(() => this.settings)

		this.addCommand({
			id: 'copy-id',
			name: 'Copy ID to clipboard',
			callback: async () => {
				try {
					const id = this.api.generate()
					await navigator.clipboard.writeText(id)
					new Notice(`Copied ${id}`)
				} catch (error) {
					notifyError(error)
				}
			},
		})

		this.addCommand({
			id: 'insert-id',
			name: 'Insert ID',
			editorCallback: (editor: Editor) => {
				try {
					editor.replaceSelection(this.api.generate())
				} catch (error) {
					notifyError(error)
				}
			},
		})

		this.addSettingTab(new UniqueIdGeneratorSettingTab(this.app, this))
	}

	async updateSettings(next: UniqueIdGeneratorSettings) {
		this.settings = next
		await this.saveData(next)
	}
}

function notifyError(error: unknown) {
	new Notice(error instanceof Error ? error.message : String(error))
}
