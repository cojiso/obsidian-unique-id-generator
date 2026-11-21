import { type Editor, Notice, Plugin } from 'obsidian'
import {
	DEFAULT_SETTINGS,
	type UniqueIdGeneratorSettings,
	UniqueIdGeneratorSettingTab,
} from './settings'

export default class UniqueIdGeneratorPlugin extends Plugin {
	settings!: UniqueIdGeneratorSettings

	async onload() {
		await this.loadSettings()

		this.addCommand({
			id: 'copy-id',
			name: 'Copy ID to clipboard',
			callback: async () => {
				await navigator.clipboard.writeText(this.generate())
				new Notice('ID copied')
			},
		})

		this.addCommand({
			id: 'insert-id',
			name: 'Insert ID',
			editorCallback: (editor: Editor) => {
				editor.replaceSelection(this.generate())
			},
		})

		this.addSettingTab(new UniqueIdGeneratorSettingTab(this.app, this))
	}

	onunload() {}

	// TODO: 方式ごとの生成器に置き換える。いまは仮に base36 の現在時刻（ミリ秒）を返す。
	generate(): string {
		return this.settings.prefix + Date.now().toString(36)
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<UniqueIdGeneratorSettings>,
		)
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}
