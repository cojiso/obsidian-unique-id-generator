import { type App, PluginSettingTab, Setting } from 'obsidian'
import type UniqueIdGeneratorPlugin from './main'

export interface UniqueIdGeneratorSettings {
	// TODO: 方式、方式ごとの設定、名前付きプリセットを足す（docs/scope.md「設定画面」）
	prefix: string
}

export const DEFAULT_SETTINGS: UniqueIdGeneratorSettings = {
	prefix: '',
}

export class UniqueIdGeneratorSettingTab extends PluginSettingTab {
	plugin: UniqueIdGeneratorPlugin

	constructor(app: App, plugin: UniqueIdGeneratorPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl).setName('Format').setHeading()

		new Setting(containerEl)
			.setName('Prefix')
			.setDesc('Text added before every ID.')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.prefix)
					.onChange(async (value) => {
						this.plugin.settings.prefix = value
						await this.plugin.saveSettings()
					}),
			)
	}
}
