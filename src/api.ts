import { ALPHABETS, checkAlphabet } from './alphabets'
import { Clock, type TimeUnit } from './clock'
import { encodeBase36 } from './methods/base36'
import { nanoid } from './methods/nanoid'
import { encodeSqids } from './methods/sqids'
import { toTypeID, toULID, uuidV4, uuidV7 } from './methods/uuid'

export const FORMATS = [
	'base36',
	'sqids',
	'nanoid',
	'uuidv4',
	'uuidv7',
	'ulid',
	'typeid',
] as const

export type Format = (typeof FORMATS)[number]

// What the user chose in the settings, used by generate().
export interface IdSettings {
	format: Format
	typeidPrefix: string
}

export interface Base36Options {
	unit?: TimeUnit
}

export interface SqidsOptions {
	alphabet?: string
	minLength?: number
	unit?: TimeUnit
}

export interface NanoidOptions {
	alphabet?: string
	size?: number
}

export interface TypeidOptions {
	prefix?: string
}

export interface UniqueIdApi {
	generate(): string
	base36(options?: Base36Options): string
	sqids(options?: SqidsOptions): string
	nanoid(options?: NanoidOptions): string
	uuidv4(): string
	uuidv7(): string
	ulid(): string
	typeid(options?: TypeidOptions): string
	readonly alphabets: typeof ALPHABETS
}

// The equivalent call shown in the settings is also built from these defaults.
export const DEFAULTS = Object.freeze({
	base36: Object.freeze({ unit: 'second' }),
	sqids: Object.freeze({
		alphabet: ALPHABETS.bech32,
		minLength: 0,
		unit: 'second',
	}),
	nanoid: Object.freeze({ alphabet: ALPHABETS.bech32, size: 16 }),
	typeid: Object.freeze({ prefix: '' }),
} as const)

// Width to zero-pad to. Seconds fit in 7 digits until 4453-04-05, and milliseconds fit in 9 digits until 5188-04-22.
const BASE36_WIDTH: Record<TimeUnit, number> = { second: 7, millisecond: 9 }

// Only generate() reads the settings; the per-format functions ignore them.
// All functions and commands share one clock so that its +1 keeps time values distinct across them.
export function createApi(
	getSettings: () => IdSettings,
	clock: Clock = new Clock(),
): UniqueIdApi {
	const base36 = (options?: unknown) => {
		const o = readOptions(options, ['unit'])
		const unit = readUnit(o.unit, DEFAULTS.base36.unit)
		return encodeBase36(clock.next(unit), BASE36_WIDTH[unit])
	}

	const sqids = (options?: unknown) => {
		const o = readOptions(options, ['alphabet', 'minLength', 'unit'])
		const d = DEFAULTS.sqids
		return encodeSqids([clock.next(readUnit(o.unit, d.unit))], {
			alphabet: readAlphabet(o.alphabet, d.alphabet),
			minLength: readInteger('minLength', o.minLength, d.minLength, 0),
		})
	}

	const nanoidFn = (options?: unknown) => {
		const o = readOptions(options, ['alphabet', 'size'])
		const d = DEFAULTS.nanoid
		return nanoid(
			readAlphabet(o.alphabet, d.alphabet),
			readInteger('size', o.size, d.size, 1),
		)
	}

	const typeid = (options?: unknown) => {
		const o = readOptions(options, ['prefix'])
		return toTypeID(
			readString('prefix', o.prefix, DEFAULTS.typeid.prefix),
			uuidV7(),
		)
	}

	const generate = (): string => {
		const { format, typeidPrefix } = getSettings()
		switch (format) {
			case 'base36':
				return base36()
			case 'sqids':
				return sqids()
			case 'nanoid':
				return nanoidFn()
			case 'uuidv4':
				return uuidV4()
			case 'uuidv7':
				return uuidV7()
			case 'ulid':
				return toULID(uuidV7())
			case 'typeid':
				return typeid({ prefix: typeidPrefix })
			default:
				throw new Error(`Unknown format in settings: ${String(format)}`)
		}
	}

	return Object.freeze({
		generate: withoutArgs('generate', generate),
		base36: named('base36', base36),
		sqids: named('sqids', sqids),
		nanoid: named('nanoid', nanoidFn),
		uuidv4: withoutArgs('uuidv4', uuidV4),
		uuidv7: withoutArgs('uuidv7', uuidV7),
		ulid: withoutArgs('ulid', () => toULID(uuidV7())),
		typeid: named('typeid', typeid),
		alphabets: ALPHABETS,
	})
}

// Prefixes error messages with the function name, including errors thrown by the libraries.
function named<A extends unknown[]>(
	name: string,
	fn: (...args: A) => string,
): (...args: A) => string {
	return (...args) => {
		try {
			return fn(...args)
		} catch (error) {
			if (error instanceof Error) {
				error.message = `Unique ID Generator: ${name}(): ${error.message}`
			}
			throw error
		}
	}
}

// Throws instead of silently ignoring arguments passed to a function that takes none.
function withoutArgs(name: string, fn: () => string): () => string {
	return named(name, (...args: unknown[]) => {
		if (args.length > 0) {
			throw new TypeError('This function takes no arguments.')
		}
		return fn()
	})
}

// Unknown keys throw so that a misspelled option is noticed.
function readOptions<K extends string>(
	options: unknown,
	keys: readonly K[],
): Partial<Record<K, unknown>> {
	if (options === undefined) {
		return {}
	}
	if (
		typeof options !== 'object' ||
		options === null ||
		Array.isArray(options)
	) {
		throw new TypeError('Options must be an object.')
	}
	for (const key of Object.keys(options)) {
		if (!(keys as readonly string[]).includes(key)) {
			throw new TypeError(
				`Unknown option "${key}". Available options: ${keys.join(', ')}.`,
			)
		}
	}
	return options
}

function readUnit(value: unknown, fallback: TimeUnit): TimeUnit {
	if (value === undefined) {
		return fallback
	}
	if (value === 'second' || value === 'millisecond') {
		return value
	}
	throw new TypeError(
		`unit must be 'second' or 'millisecond': ${show(value)}`,
	)
}

function readAlphabet(value: unknown, fallback: string): string {
	if (value === undefined) {
		return fallback
	}
	if (typeof value !== 'string') {
		throw new TypeError(
			'alphabet must be a string of characters, such as api.alphabets.crockford.',
		)
	}
	return checkAlphabet(value)
}

function readInteger(
	name: string,
	value: unknown,
	fallback: number,
	min: number,
): number {
	if (value === undefined) {
		return fallback
	}
	if (
		typeof value !== 'number' ||
		!Number.isSafeInteger(value) ||
		value < min
	) {
		throw new RangeError(
			`${name} must be an integer of ${min} or more: ${show(value)}`,
		)
	}
	return value
}

function readString(name: string, value: unknown, fallback: string): string {
	if (value === undefined) {
		return fallback
	}
	if (typeof value !== 'string') {
		throw new TypeError(`${name} must be a string.`)
	}
	return value
}

// Shows the passed value in error messages, without turning objects into [object Object].
function show(value: unknown): string {
	return JSON.stringify(value) ?? typeof value
}
