import { ALPHABETS } from './alphabets'
import { DEFAULTS, type Format, type IdSettings } from './api'
import { type TypeIdPrefixIssue, typeIdPrefixIssues } from './methods/uuid'

// The axes the format modal uses to guide the choice. Only the Format they lead to is saved.
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

// Axes the format does not use still get a value, so that switching Length away and back restores the earlier selection.
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

// Whether each axis can be chosen, is fixed by the other choices, or does not apply.
// A fixed axis shows its value instead of appearing as if nothing is selected.
// Ordering only means whether sorting the IDs as strings gives creation order, so random IDs count as Unordered. Whether the time can be decoded is a matter of Based on.
// So Ordering and Based on always have a value, and only Encoding can be 'none'.
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

// Syncs the axes when a format is picked directly. Axes that format does not use keep their earlier values, so those come back once the axes can be chosen again.
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

// Whether saving would change the generated IDs. The prefix is compared only for TypeID, since no other format uses it.
export function changed(a: IdSettings, b: IdSettings): boolean {
	if (a.format !== b.format) {
		return true
	}
	return b.format === 'typeid' && a.typeidPrefix !== b.typeidPrefix
}

// What the modal shows. The modal's state is only the axis selection (choice) and the prefix input; everything else is computed here.
export interface ModalView {
	axes: { length: AxisState<Length> } & AxisStates
	// The Encoding and Type prefix rows often do not apply, so they are shown only when needed.
	showEncoding: boolean
	showPrefix: boolean
	prefixIssues: TypeIdPrefixIssue[]
	// Saved by Save. An invalid prefix is not saved, and the current prefix is kept.
	next: IdSettings
	// Used for the example and the call. While the prefix is invalid, they keep showing a TypeID without a prefix.
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

// Item labels for the dropdown that picks a format directly.
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

// A call that gives the same result as generate(). Defaults are written out so that the call shows exactly what is selected and can be copied into a script as is.
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
