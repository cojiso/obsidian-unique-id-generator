import { type Editor, Notice, Plugin } from 'obsidian'
import { createApi, type UniqueIdApi } from './api'
import { Clock } from './clock'
import { UniqueIdGeneratorSettingTab } from './settings'
import { readSettings, type UniqueIdGeneratorSettings } from './settings-data'

const CLOCK_STORAGE_KEY = 'unique-id-generator-clock'

export default class UniqueIdGeneratorPlugin extends Plugin {
	settings!: UniqueIdGeneratorSettings
	// Scripts call it as app.plugins.plugins['unique-id-generator'].api.
	api!: UniqueIdApi

	async onload() {
		this.settings = readSettings(await this.loadData())
		// Keep the clock's last values in this vault's localStorage on this device, so IDs made from the time don't repeat after a reload or restart.
		this.api = createApi(
			() => this.settings,
			new Clock(Date.now, {
				load: (): unknown =>
					this.app.loadLocalStorage(CLOCK_STORAGE_KEY) as unknown,
				save: (state) =>
					this.app.saveLocalStorage(CLOCK_STORAGE_KEY, state),
			}),
		)

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
