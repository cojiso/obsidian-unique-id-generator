import {
	type App,
	Component,
	ExtraButtonComponent,
	PluginSettingTab,
	type Setting,
	type SettingDefinitionItem,
} from 'obsidian'
import { FormatModal } from './format-modal'
import type UniqueIdGeneratorPlugin from './main'
import { example, renderCall } from './ui'

export class UniqueIdGeneratorSettingTab extends PluginSettingTab {
	plugin: UniqueIdGeneratorPlugin

	constructor(app: App, plugin: UniqueIdGeneratorPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	// 宣言的な設定 API（Obsidian 1.13.0 以上）。
	// 形式はうっかり変えると ID の見た目が揃わなくなるので、ここには今の選択を出すだけにし、変えるのはモーダルで行う。
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Default ID format',
				aliases: [
					'base36',
					'Sqids',
					'NanoID',
					'UUID',
					'ULID',
					'TypeID',
				],
				// 説明は1文。その下に行の幅いっぱいで、同じ結果になる呼び出しのコードブロック。
				render: (setting: Setting) => {
					const component = new Component()
					component.load()
					setting.settingEl.addClass('unique-id-generator-wrap-row')
					setting.setDesc('Used by the commands and api.generate().')
					// 右上は Change… だけにする。例の ID を Change… の隣に置くと、Change… がその ID を変えるボタンに見えるので、
					// 例の ID とすぐ隣の作り直すボタンは、コードブロックの下の右に置く（呼び出しと、その結果の並び）。
					setting.addButton((b) =>
						b.setButtonText('Change…').onClick(() => {
							new FormatModal(
								this.app,
								this.plugin.settings,
								async (next) => {
									await this.plugin.updateSettings(next)
									void show()
								},
							).open()
						}),
					)
					const slot = setting.settingEl.createDiv({
						cls: 'unique-id-generator-call-slot',
					})
					const callEl = slot.createDiv()
					const exampleEl = slot.createDiv({
						cls: 'unique-id-generator-example',
					})
					const idEl = exampleEl.createSpan()
					const showExample = () =>
						idEl.setText(example(this.plugin.settings))
					new ExtraButtonComponent(exampleEl)
						.setIcon('refresh-cw')
						.setTooltip('Generate another example')
						.onClick(showExample)
					const show = async () => {
						showExample()
						callEl.replaceChildren(
							await renderCall(
								this.app,
								this.plugin.settings,
								component,
							),
						)
					}
					void show()
					return () => component.unload()
				},
			},
		]
	}
}
