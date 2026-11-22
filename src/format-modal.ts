import {
	type App,
	ButtonComponent,
	Component,
	type DisplayValueComponent,
	DropdownComponent,
	Modal,
	Setting,
	SettingGroup,
} from 'obsidian'
import type { Format, IdSettings } from './api'
import {
	type AxisState,
	type Basis,
	type Choice,
	chooseFormat,
	FORMAT_LABELS,
	LABELS,
	type Length,
	type ModalView,
	modalView,
	type Ordering,
	toChoice,
} from './choice'
import type { TypeIdPrefixIssue } from './methods/uuid'
import { capture, example, renderCall } from './ui'

// States the uniqueness scope briefly in distributed-systems terms: locally unique, collision-resistant, globally unique.
const LENGTH_DESC: Record<Length, string> = {
	short: '7 or 8 characters. Locally unique.',
	medium: '16 characters. Collision-resistant.',
	long: '26 to 36 characters. Globally unique.',
}

// What is worth saying is that Time can be decoded back to the time; Random gets only a light line. Both are one line, so switching does not change the height.
const BASIS_DESC: Record<Basis, string> = {
	time: 'The time can be decoded from the ID.',
	random: 'Made from random numbers.',
}

const ORDERING_DESC: Record<Ordering, string> = {
	'time-ordered': 'Sorting by ID also sorts by creation time.',
	unordered: 'Consecutive IDs look unrelated.',
}

// Encoding shows the same sentence for every value. The Example already shows the form, and the names need no paraphrase.
// Neither the names nor the Example reveal that all three hold the same bits and convert into each other, so that is all it says. The fixed sentence also keeps the height from changing.
const ENCODING_DESC = 'Lossless encodings of the same 128 bits.'

// The description names only the allowed characters. The other rules, up to 63 characters and starting and ending with a letter, appear as errors when broken.
const PREFIX_DESC = 'Lowercase letters and underscores.'
const PREFIX_ERRORS: Record<TypeIdPrefixIssue, string> = {
	characters: 'Use only lowercase letters and underscores.',
	length: 'Use up to 63 characters.',
	edges: 'Start and end with a letter.',
}

// The format is rarely changed once chosen, so nothing is saved until Save is pressed. Closing or Cancel leaves the settings as they were.
// The state is only the axis selection (choice) and the prefix input. modalView in choice.ts, which is tested, computes what to show; this class only applies it to the screen.
// Every control updates the state and then calls refresh(), so the axis buttons and the dropdown cannot disagree.
export class FormatModal extends Modal {
	private readonly current: IdSettings
	private readonly onSave: (next: IdSettings) => Promise<void>
	private choice: Choice
	private prefix: string
	// Cleans up what MarkdownRenderer renders.
	private component = new Component()
	private renderToken = 0

	constructor(
		app: App,
		current: IdSettings,
		onSave: (next: IdSettings) => Promise<void>,
	) {
		super(app)
		this.current = current
		this.onSave = onSave
		this.choice = toChoice(current.format)
		this.prefix = current.typeidPrefix
	}

	private view(): ModalView {
		return modalView(this.current, this.choice, this.prefix)
	}

	onOpen(): void {
		this.component = new Component()
		this.component.load()
		this.setTitle('Default ID format')
		// styles.css has rules that apply only inside this modal, such as the height of the call code block.
		this.modalEl.addClass('unique-id-generator-modal')
		const { contentEl } = this
		const update = (change: () => void) => {
			change()
			refresh()
		}

		// Following "Settings inside a modal" in the Obsidian docs, the modal is also built from Setting and SettingGroup, which aligns it like the settings tab.
		// The choices and the Example already show the current setting when the modal opens, so there is no separate box for it. There is only one group, so it has no heading.
		const group = new SettingGroup(contentEl)

		// Rows are ordered so that each choice decides the rows below it. Length decides Based on, as Time for Short and Random for Medium, and in Long, Based on decides Ordering.
		const length = choiceRow(group, 'Length', LABELS.length, (v) =>
			update(() => {
				this.choice = { ...this.choice, length: v }
			}),
		)
		const basis = choiceRow(group, 'Based on', LABELS.basis, (v) =>
			update(() => {
				this.choice = { ...this.choice, basis: v }
			}),
		)
		const ordering = choiceRow(group, 'Ordering', LABELS.ordering, (v) =>
			update(() => {
				this.choice = { ...this.choice, ordering: v }
			}),
		)
		const encoding = choiceRow(group, 'Encoding', LABELS.encoding, (v) =>
			update(() => {
				this.choice = { ...this.choice, encoding: v }
			}),
		)
		const prefix = addRow(group)
			.setName('Type prefix')
			.setDesc(PREFIX_DESC)
			.addText((t) =>
				t
					.setPlaceholder('task')
					.setValue(this.prefix)
					.onChange((v) =>
						update(() => {
							this.prefix = v
						}),
					),
			)

		// The Example row does not repeat the labels, such as Short · Unordered, because the buttons right above show them.
		const exampleRow = addRow(group).setName('Example')
		exampleRow.settingEl.addClass('unique-id-generator-wrap-row')
		// addDisplayValue, available from Obsidian 1.13.1, is the official component for showing a row's value.
		const idValue = capture<DisplayValueComponent>((cb) =>
			exampleRow.addDisplayValue(cb),
		)
		const showExample = () => idValue.setValue(example(this.view().preview))
		exampleRow.addExtraButton((b) =>
			b
				.setIcon('refresh-cw')
				.setTooltip('Generate another example')
				.onClick(showExample),
		)
		// The code block goes directly under the row (settingEl), and CSS wraps it below the name and the ID.
		const callEl = exampleRow.settingEl.createDiv({
			cls: 'unique-id-generator-call-slot',
		})

		// Long is a common choice and adds the Encoding row. To keep the modal from growing each time, a space of the same height stands in while the Encoding row is hidden.
		// The space sits outside the group, above the button row, so choosing Long moves the Example down and shrinks the space, and the modal height stays the same.
		// The Type prefix row, shown for TypeID, gets no space because few people choose it.
		const reserve = contentEl.createDiv({
			cls: 'unique-id-generator-reserve',
		})
		// Measured in the first refresh(), once the description is in place.
		let encodingHeight: number | undefined

		const footer = new Setting(contentEl)
		// A shortcut for people who know the format names: a dropdown that picks the format directly, at the left of the button row.
		// Next to Save, it also confirms by name what will be saved, without adding a row.
		const formatDropdown = new DropdownComponent(footer.infoEl)
			.addOptions(FORMAT_LABELS)
			.onChange((v) =>
				update(() => {
					this.choice = chooseFormat(this.choice, v as Format)
				}),
			)
		new ButtonComponent(footer.controlEl)
			.setButtonText('Cancel')
			.onClick(() => this.close())
		const save = new ButtonComponent(footer.controlEl)
			.setButtonText('Save')
			.setCta()
			.onClick(async () => {
				await this.onSave(this.view().next)
				this.close()
			})

		const refresh = () => {
			const view = this.view()
			length.apply(
				view.axes.length,
				descOf(view.axes.length, LENGTH_DESC),
			)
			basis.apply(view.axes.basis, descOf(view.axes.basis, BASIS_DESC))
			ordering.apply(
				view.axes.ordering,
				descOf(view.axes.ordering, ORDERING_DESC),
			)
			encoding.apply(view.axes.encoding, ENCODING_DESC)
			encodingHeight ??= measureRowHeight(encoding.setting)
			encoding.setting.settingEl.toggle(view.showEncoding)
			reserve.setCssProps({
				'--unique-id-generator-reserve': view.showEncoding
					? '0px'
					: `${encodingHeight}px`,
			})
			prefix.settingEl.toggle(view.showPrefix)
			prefix.setErrorMessage(
				view.prefixIssues.length === 0
					? null
					: view.prefixIssues.map((i) => PREFIX_ERRORS[i]).join(' '),
			)
			showExample()
			void this.renderCall(callEl, view.preview)
			formatDropdown.setValue(view.next.format)
			save.setDisabled(!view.canSave)
		}
		refresh()
	}

	onClose(): void {
		this.component.unload()
		this.contentEl.empty()
	}

	// Rendering is async, so when the buttons are pressed in quick succession, only the last result is kept.
	private async renderCall(
		el: HTMLElement,
		settings: IdSettings,
	): Promise<void> {
		const token = ++this.renderToken
		const out = await renderCall(this.app, settings, this.component)
		if (token === this.renderToken) {
			el.replaceChildren(out)
		}
	}
}

// The public API has no toggle button group, so each option gets its own button.
function choiceRow<V extends string>(
	group: SettingGroup,
	name: string,
	labels: Record<V, string>,
	onSelect: (value: V) => void,
): { setting: Setting; apply: (state: AxisState<V>, desc: string) => void } {
	const setting = addRow(group).setName(name)
	const buttons = new Map<V, ButtonComponent>()
	for (const value of Object.keys(labels) as V[]) {
		setting.addButton((b) => {
			buttons.set(value, b)
			b.setButtonText(labels[value])
				.setClass('unique-id-generator-choice')
				.onClick(() => onSelect(value))
		})
	}
	// A disabled row stays shown so that heights and the reader's eye do not shift. Its description is the same as when it can be chosen; the button styling shows that it is disabled and which value is fixed.
	// In a row that can be chosen, the selected value uses Obsidian's standard CTA highlight. A value fixed by the other choices uses the outline from styles.css. A row that does not apply highlights nothing.
	const apply = (state: AxisState<V>, desc: string) => {
		const choosable = state.kind === 'choose'
		setting.setDisabled(!choosable)
		for (const [value, b] of buttons) {
			const selected = state.kind !== 'none' && value === state.value
			b.setDisabled(!choosable)
			if (selected && choosable) {
				b.setCta()
			} else {
				b.removeCta()
			}
			b.buttonEl.toggleClass('is-fixed', selected && !choosable)
			b.buttonEl.setAttribute('aria-pressed', String(selected))
		}
		setting.setDesc(desc)
	}
	return { setting, apply }
}

function descOf<V extends string>(
	state: AxisState<V>,
	descs: Record<V, string>,
): string {
	return state.kind === 'none' ? '' : descs[state.value]
}

// Measures how much the group's height changes between the row shown and hidden, not the row itself, so that the gap between rows and the overlapping dividers are included.
// Row height depends on the theme, so it is measured when the modal opens.
function measureRowHeight(row: Setting): number {
	const items = row.settingEl.parentElement
	row.settingEl.toggle(true)
	const shown = items?.offsetHeight ?? 0
	row.settingEl.toggle(false)
	const hidden = items?.offsetHeight ?? 0
	return shown - hidden
}

// SettingGroup.addSetting returns the group, so this returns the created row instead.
function addRow(group: SettingGroup): Setting {
	return capture<Setting>((cb) => group.addSetting(cb))
}
