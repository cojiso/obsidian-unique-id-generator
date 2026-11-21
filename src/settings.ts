import {
	type App,
	PluginSettingTab,
	type SettingDefinitionItem,
} from 'obsidian'
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

	// 宣言的な設定 API（Obsidian 1.13.0 以上）。値の読み書きと保存は Obsidian が行う。
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Prefix',
				desc: 'Text added before every ID.',
				control: { type: 'text', key: 'prefix' },
			},
		]
	}
}
