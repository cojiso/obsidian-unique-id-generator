import { ALPHABETS } from './alphabets'
import { DEFAULTS, type Format, type IdSettings } from './api'
import { type TypeIdPrefixIssue, typeIdPrefixIssues } from './methods/uuid'

// 設定画面のガイドの軸。保存するのは、軸から決まる形式（Format）だけ。
export type Length = 'short' | 'medium' | 'long'
export type Ordering = 'time-ordered' | 'unordered'
export type Basis = 'time' | 'random'
export type Encoding = 'uuid' | 'ulid' | 'typeid'

export interface Choice {
	length: Length
	ordering: Ordering
	basis: Basis
	encoding: Encoding
}

// 使わない軸にも値を持たせておき、Length を切り替えて戻ったときに前の選択が残るようにする。
const UNUSED: Choice = {
	length: 'short',
	ordering: 'unordered',
	basis: 'time',
	encoding: 'uuid',
}

const ENCODING_FORMAT = {
	uuid: 'uuidv7',
	ulid: 'ulid',
	typeid: 'typeid',
} as const satisfies Record<Encoding, Format>

export function toFormat(choice: Choice): Format {
	switch (choice.length) {
		case 'short':
			return choice.ordering === 'time-ordered' ? 'base36' : 'sqids'
		case 'medium':
			return 'nanoid'
		case 'long':
			return choice.basis === 'random'
				? 'uuidv4'
				: ENCODING_FORMAT[choice.encoding]
	}
}

export function toChoice(format: Format): Choice {
	switch (format) {
		case 'base36':
			return { ...UNUSED, length: 'short', ordering: 'time-ordered' }
		case 'sqids':
			return { ...UNUSED, length: 'short', ordering: 'unordered' }
		case 'nanoid':
			return { ...UNUSED, length: 'medium' }
		case 'uuidv4':
			return { ...UNUSED, length: 'long', basis: 'random' }
		case 'uuidv7':
			return {
				...UNUSED,
				length: 'long',
				basis: 'time',
				encoding: 'uuid',
			}
		case 'ulid':
			return {
				...UNUSED,
				length: 'long',
				basis: 'time',
				encoding: 'ulid',
			}
		case 'typeid':
			return {
				...UNUSED,
				length: 'long',
				basis: 'time',
				encoding: 'typeid',
			}
	}
}

// 各軸が、選べるのか、ほかの選択から決まっているのか、当てはまらないのか。
// 決まっている軸は、その値を見せる（どれでもないように描かない）。
// Ordering は「文字列として並べると作った順になるか」だけの軸なので、乱数は Unordered に入る（時刻に戻せるかは Based on の性質）。
// なので Ordering と Based on はいつも値を持ち、当てはまらないことがあるのは Encoding だけ。
export type AxisState<V extends string> =
	| { kind: 'choose'; value: V }
	| { kind: 'fixed'; value: V }
	| { kind: 'none' }

export interface AxisStates {
	ordering: AxisState<Ordering>
	basis: AxisState<Basis>
	encoding: AxisState<Encoding>
}

export function axisStates(choice: Choice): AxisStates {
	switch (choice.length) {
		case 'short':
			return {
				ordering: { kind: 'choose', value: choice.ordering },
				basis: { kind: 'fixed', value: 'time' },
				encoding: { kind: 'none' },
			}
		case 'medium':
			return {
				ordering: { kind: 'fixed', value: 'unordered' },
				basis: { kind: 'fixed', value: 'random' },
				encoding: { kind: 'none' },
			}
		case 'long':
			return choice.basis === 'time'
				? {
						ordering: { kind: 'fixed', value: 'time-ordered' },
						basis: { kind: 'choose', value: 'time' },
						encoding: { kind: 'choose', value: choice.encoding },
					}
				: {
						ordering: { kind: 'fixed', value: 'unordered' },
						basis: { kind: 'choose', value: 'random' },
						encoding: { kind: 'fixed', value: 'uuid' },
					}
	}
}

// 形式を直接選んだときに軸を合わせる。その形式で使わない軸は、前に選んでいた値を残す（選べるようになったら戻すため）。
export function chooseFormat(choice: Choice, format: Format): Choice {
	const c = toChoice(format)
	const next: Choice = { ...choice, length: c.length }
	if (c.length === 'short') {
		next.ordering = c.ordering
	}
	if (c.length === 'long') {
		next.basis = c.basis
		if (c.basis === 'time') {
			next.encoding = c.encoding
		}
	}
	return next
}

// 保存したときに見た目が変わるか。TypeID 以外では prefix は使わないので比べない。
export function changed(a: IdSettings, b: IdSettings): boolean {
	if (a.format !== b.format) {
		return true
	}
	return b.format === 'typeid' && a.typeidPrefix !== b.typeidPrefix
}

// モーダルに何を出すか。モーダルの状態は軸の選択（choice）と prefix の入力だけで、ほかは全部ここで計算する。
export interface ModalView {
	axes: { length: AxisState<Length> } & AxisStates
	// Encoding と Type prefix の行は、当てはまらないことが多いので要るときだけ出す。
	showEncoding: boolean
	showPrefix: boolean
	prefixIssues: TypeIdPrefixIssue[]
	// Save で保存するもの。正しくない prefix は保存せず、今の prefix を残す。
	next: IdSettings
	// 例と呼び出しに使うもの。prefix が正しくないあいだも、prefix なしの TypeID で出し続ける。
	preview: IdSettings
	canSave: boolean
}

export function modalView(
	current: IdSettings,
	choice: Choice,
	prefix: string,
): ModalView {
	const format = toFormat(choice)
	const typeid = format === 'typeid'
	const prefixIssues = typeid ? typeIdPrefixIssues(prefix) : []
	const next: IdSettings = {
		format,
		typeidPrefix:
			typeIdPrefixIssues(prefix).length === 0
				? prefix
				: current.typeidPrefix,
	}
	const usable = prefixIssues.length === 0
	return {
		axes: {
			length: { kind: 'choose', value: choice.length },
			...axisStates(choice),
		},
		showEncoding: choice.length === 'long',
		showPrefix: typeid,
		prefixIssues,
		next,
		preview: usable ? next : { format: 'typeid', typeidPrefix: '' },
		canSave: usable && changed(current, next),
	}
}

// 形式を直接選ぶドロップダウンの項目名。
export const FORMAT_LABELS = {
	base36: 'base36',
	sqids: 'Sqids',
	nanoid: 'NanoID',
	uuidv4: 'UUID v4',
	uuidv7: 'UUID v7',
	ulid: 'ULID',
	typeid: 'TypeID',
} as const satisfies Record<Format, string>

export const LABELS = {
	length: { short: 'Short', medium: 'Medium', long: 'Long' },
	ordering: { 'time-ordered': 'Time-ordered', unordered: 'Unordered' },
	basis: { time: 'Time', random: 'Random' },
	encoding: { uuid: 'UUID', ulid: 'ULID', typeid: 'TypeID' },
} as const

// generate() と同じ結果になる呼び出し。既定値も省略せずに書き、何を選んでいるかを正確に見せる。そのままスクリプトにも写せる。
export function equivalentCall({ format, typeidPrefix }: IdSettings): string {
	switch (format) {
		case 'base36':
			return call(format, DEFAULTS.base36)
		case 'sqids':
			return call(format, DEFAULTS.sqids)
		case 'nanoid':
			return call(format, DEFAULTS.nanoid)
		case 'typeid':
			return call(format, { prefix: typeidPrefix })
		default:
			return call(format, {})
	}
}

function call(name: string, options: Record<string, string | number>): string {
	const entries = Object.entries(options).map(
		([key, value]) => `${key}: ${literal(value)}`,
	)
	return entries.length === 0
		? `api.${name}()`
		: `api.${name}({ ${entries.join(', ')} })`
}

function literal(value: string | number): string {
	if (typeof value === 'number') {
		return String(value)
	}
	const name = Object.entries(ALPHABETS).find(([, a]) => a === value)?.[0]
	return name ? `api.alphabets.${name}` : `'${value}'`
}
