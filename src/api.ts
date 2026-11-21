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

// generate() が使う、設定画面で選んだもの。
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

// 先頭を 0 で埋める桁数。秒は 4453 年まで、ミリ秒は 5188 年まで桁が増えない。
const BASE36_WIDTH: Record<TimeUnit, number> = { second: 7, millisecond: 9 }

// 形式ごとの関数は設定を見ない。設定を使うのは generate() だけ。
// 時刻の +1 を正しく効かせるため、clock はすべての関数とコマンドで1つを使う。
export function createApi(
	getSettings: () => IdSettings,
	clock: Clock = new Clock(),
): UniqueIdApi {
	const base36 = (options?: unknown) => {
		const o = readOptions(options, ['unit'])
		const unit = readUnit(o.unit)
		return encodeBase36(clock.next(unit), BASE36_WIDTH[unit])
	}

	const sqids = (options?: unknown) => {
		const o = readOptions(options, ['alphabet', 'minLength', 'unit'])
		return encodeSqids([clock.next(readUnit(o.unit))], {
			alphabet: readAlphabet(o.alphabet),
			minLength: readInteger('minLength', o.minLength, 0, 0),
		})
	}

	const nanoidFn = (options?: unknown) => {
		const o = readOptions(options, ['alphabet', 'size'])
		return nanoid(
			readAlphabet(o.alphabet),
			readInteger('size', o.size, 16, 1),
		)
	}

	const typeid = (options?: unknown) => {
		const o = readOptions(options, ['prefix'])
		return toTypeID(readString('prefix', o.prefix, ''), uuidV7())
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

// エラーの文の頭に、どの関数で起きたかを付ける。ライブラリが投げたエラーも同じように扱う。
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

// オプションを受け取らない関数に何か渡したら、黙って無視せずエラーにする。
function withoutArgs(name: string, fn: () => string): () => string {
	return named(name, (...args: unknown[]) => {
		if (args.length > 0) {
			throw new TypeError('This function takes no arguments.')
		}
		return fn()
	})
}

// 知らないキーは、綴り間違いに気づけるようエラーにする。
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

function readUnit(value: unknown): TimeUnit {
	if (value === undefined) {
		return 'second'
	}
	if (value === 'second' || value === 'millisecond') {
		return value
	}
	throw new TypeError(
		`unit must be 'second' or 'millisecond': ${show(value)}`,
	)
}

function readAlphabet(value: unknown): string {
	if (value === undefined) {
		return ALPHABETS.bech32
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

// エラーの文に、渡された値を見せる。オブジェクトも [object Object] にならないようにする。
function show(value: unknown): string {
	return JSON.stringify(value) ?? typeof value
}
