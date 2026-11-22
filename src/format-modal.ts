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

// 重なりにくさの範囲は、分散システムの用語（locally / globally unique、collision-resistant）で短く言う。
const LENGTH_DESC: Record<Length, string> = {
	short: '7 or 8 characters. Locally unique.',
	medium: '16 characters. Collision-resistant.',
	long: '26 to 36 characters. Globally unique.',
}

// 言う価値があるのは Time の「時刻に戻せる」ほう。Random は軽く言うだけにする。どちらも1行なので、切り替えても高さは変わらない。
const BASIS_DESC: Record<Basis, string> = {
	time: 'The time can be decoded from the ID.',
	random: 'Made from random numbers.',
}

const ORDERING_DESC: Record<Ordering, string> = {
	'time-ordered': 'Sorting by ID also sorts by creation time.',
	unordered: 'Consecutive IDs look unrelated.',
}

// Encoding は値ごとに出し分けず、行にいつも同じ1文を出す。形は Example で見え、名前の言い換えは要らない。
// 3つとも中身が同じで変換できることは、名前からも Example からも分からないので、それだけを言う。文が変わらないので高さも動かない。
const ENCODING_DESC = 'Lossless encodings of the same 128 bits.'

// 説明は使える文字だけを言う。細かい決まり（63文字まで、先頭と末尾は英字）は、外れたときにエラーで出す。
const PREFIX_DESC = 'Lowercase letters and underscores.'
// 外れた決まりだけを、エラーに並べて出す。
const PREFIX_ERRORS: Record<TypeIdPrefixIssue, string> = {
	characters: 'Use only lowercase letters and underscores.',
	length: 'Use up to 63 characters.',
	edges: 'Start and end with a letter.',
}

// 一度選んだらほとんど変えない設定なので、Save を押すまで何も保存しない。閉じても Cancel でも元のまま。
// 状態は軸の選択（choice）と prefix の入力だけ。何を出すかは modalView（choice.ts、テストあり）が計算し、ここは画面に当てはめるだけにする。
// どの部品を操作しても「状態を書き換えて refresh()」なので、軸のボタンとドロップダウンが食い違うことはない。
export class FormatModal extends Modal {
	private readonly current: IdSettings
	private readonly onSave: (next: IdSettings) => Promise<void>
	private choice: Choice
	private prefix: string
	// MarkdownRenderer が描いたものは、この Component が片付ける。モーダルを開くたびに作り直す。
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
		const { contentEl } = this
		const update = (change: () => void) => {
			change()
			refresh()
		}

		// ドキュメントの「Settings inside a modal」に沿い、モーダルの中も Setting と SettingGroup で組む。設定画面と同じ揃え方になる。
		// 開いた時点で選択肢と Example に今の設定が出るので、今の設定だけの枠は置かない。まとまりが1つなので見出しも付けない。
		const group = new SettingGroup(contentEl)

		// 上の行の選択で下の行が決まる順に並べる。Length で Based on が決まり（Short は時刻、Medium は乱数）、Based on で Ordering が決まる。
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

		// 選んだ結果は、まとまりの最後の1行に出す。右に例の ID とすぐ隣に作り直すボタン、その下に行の幅いっぱいで同じ結果になる呼び出しのコードブロック。
		// 言葉（Short · Unordered）はすぐ上のボタンで見えているので繰り返さない。コピーのボタンはコードブロック自身に付く。
		const exampleRow = addRow(group).setName('Example')
		exampleRow.settingEl.addClass('unique-id-generator-wrap-row')
		// 右の ID は、行の値を見せる公式の部品（addDisplayValue、1.13.1 から）で出す。
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
		// コードブロックは行（settingEl）の直下に置き、CSS で名前と ID の行の下に折り返す。
		const callEl = exampleRow.settingEl.createDiv({
			cls: 'unique-id-generator-call-slot',
		})

		// Long はよく選ばれ、選ぶと Encoding の行が1つ増える。そのたびにモーダルが伸びないよう、Encoding の行が出ていないあいだは同じ高さの空きを置いておく。
		// 空きはまとまりの外（ボタンの行との間）に置くので、Long にすると Example が下にずれ、空きが縮むだけでモーダルの高さは変わらない。
		// Type prefix の行（TypeID のとき）は選ぶ人が少ないので予約しない。
		const reserve = contentEl.createDiv({
			cls: 'unique-id-generator-reserve',
		})
		// 説明が入ってから測るので、最初の refresh() で測る。
		let encodingHeight: number | undefined

		const footer = new Setting(contentEl)
		// 名前を知っている人のための近道。形式を直接選ぶドロップダウンを、ボタンの行の左に置く。
		// Save のすぐ隣で、何を保存するかが名前で見える確かめにもなり、行も増えない。
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

	// 描くのは非同期なので、続けて押されたときは最後の1回の結果だけを残す。
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

// 公開の API に切り替えボタンがないので、選択肢の数だけボタンを並べる。
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
	// 行は消さずにいつも出しておき、高さや目線が動かないようにする。押せない行の説明は選べるときと同じ。押せないことと決まった値は、ボタンの見た目で分かる。
	// 選べる行で選んでいるものは Obsidian の標準の強調（CTA）、ほかの選択から決まって押せない値は styles.css の枠で示す。当てはまらない行は、どれも強調しない。
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

// 行そのものの高さではなく、行を出したときと消したときの、まとまりの高さの差を測る（行の間の余白や区切り線の重なりを含めるため）。
// 行の高さはテーマで変わるので、開いたときに測る。
function measureRowHeight(row: Setting): number {
	const items = row.settingEl.parentElement
	row.settingEl.toggle(true)
	const shown = items?.offsetHeight ?? 0
	row.settingEl.toggle(false)
	const hidden = items?.offsetHeight ?? 0
	return shown - hidden
}

// SettingGroup.addSetting は group を返すので、作った行を受け取れる形にする。
function addRow(group: SettingGroup): Setting {
	return capture<Setting>((cb) => group.addSetting(cb))
}
