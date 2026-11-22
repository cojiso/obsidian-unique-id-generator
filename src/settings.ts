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

const README_SCRIPTS_URL =
	'https://github.com/cojiso/obsidian-unique-id-generator#use-in-scripts'

export class UniqueIdGeneratorSettingTab extends PluginSettingTab {
	plugin: UniqueIdGeneratorPlugin

	constructor(app: App, plugin: UniqueIdGeneratorPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	// Declarative settings API, available from Obsidian 1.13.0.
	// Changing the format by accident would leave IDs of mixed forms, so this tab only shows the current choice, and changes happen in the modal.
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
				render: (setting: Setting) => {
					const component = new Component()
					component.load()
					setting.settingEl.addClass('unique-id-generator-wrap-row')
					// Links to the README instead of explaining usage here, following the Obsidian style guide: if background is needed, link to the docs from the description.
					setting.setDesc(
						createFragment((f) => {
							f.appendText(
								'Used by the commands and api.generate(). ',
							)
							f.createEl('a', {
								text: 'Learn more',
								href: README_SCRIPTS_URL,
							})
						}),
					)
					// Only Change... sits at the top right. Next to an example ID, Change... would look like a button that changes that ID, so the example ID and its regenerate button go below the code block on the right, as the result of the call.
					setting.addButton((b) =>
						b.setButtonText('Change...').onClick(() => {
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
