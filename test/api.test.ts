import { describe, expect, test } from 'bun:test'
import Sqids from 'sqids'
import { decodeTime, uuidToULID } from 'ulid'
import { ALPHABETS } from '../src/alphabets'
import { createApi, FORMATS, type IdSettings } from '../src/api'
import { Clock } from '../src/clock'

const SECOND = 1_763_700_000

function setup(settings: Partial<IdSettings> = {}, now = SECOND * 1000) {
	const current: IdSettings = {
		format: 'sqids',
		typeidPrefix: '',
		...settings,
	}
	const api = createApi(() => current, new Clock(() => now))
	return { api, current }
}

describe('format functions', () => {
	const { api } = setup()

	test('base36 pads seconds to 7 and milliseconds to 9 digits', () => {
		const { api } = setup()
		expect(api.base36()).toBe('0t627mo')
		expect(api.base36({ unit: 'millisecond' })).toHaveLength(9)
	})

	test('sqids uses Bech32 by default and takes an alphabet and minLength', () => {
		const id = api.sqids()
		expect(id).toHaveLength(8)
		expect([...id].every((c) => ALPHABETS.bech32.includes(c))).toBe(true)
		const custom = api.sqids({
			alphabet: ALPHABETS.crockford,
			minLength: 12,
		})
		expect(custom).toHaveLength(12)
		expect(
			new Sqids({ alphabet: ALPHABETS.crockford, minLength: 12 }).decode(
				custom,
			),
		).toHaveLength(1)
	})

	test('nanoid makes 16 Bech32 characters by default', () => {
		const id = api.nanoid()
		expect(id).toHaveLength(16)
		expect([...id].every((c) => ALPHABETS.bech32.includes(c))).toBe(true)
		expect(api.nanoid({ alphabet: '01', size: 8 })).toMatch(/^[01]{8}$/)
	})

	test('uuidv4, uuidv7, ulid and typeid have their own shapes', () => {
		expect(api.uuidv4()[14]).toBe('4')
		expect(api.uuidv7()[14]).toBe('7')
		expect(api.ulid()).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/)
		expect(api.typeid({ prefix: 'task' })).toMatch(
			/^task_[0-7][0-9a-hjkmnp-tv-z]{25}$/,
		)
		expect(api.typeid()).toMatch(/^[0-7][0-9a-hjkmnp-tv-z]{25}$/)
	})

	test('ulid comes from v7 and keeps the current milliseconds', () => {
		const before = Date.now()
		const time = decodeTime(api.ulid())
		expect(time).toBeGreaterThanOrEqual(before)
		expect(time).toBeLessThanOrEqual(Date.now())
	})

	test('exposes the named alphabets', () => {
		expect(api.alphabets).toBe(ALPHABETS)
		expect(Object.isFrozen(api)).toBe(true)
	})
})

describe('generate', () => {
	test('uses the format chosen in the settings', () => {
		const { api, current } = setup()
		const shapes: Record<(typeof FORMATS)[number], RegExp> = {
			base36: /^[0-9a-z]{7}$/,
			sqids: /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{8}$/,
			nanoid: /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{16}$/,
			uuidv4: /^[0-9a-f]{8}-[0-9a-f]{4}-4/,
			uuidv7: /^[0-9a-f]{8}-[0-9a-f]{4}-7/,
			ulid: /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/,
			typeid: /^[0-7][0-9a-hjkmnp-tv-z]{25}$/,
		}
		for (const format of FORMATS) {
			current.format = format
			expect(api.generate()).toMatch(shapes[format])
		}
	})

	test('adds the TypeID prefix from the settings', () => {
		const { api } = setup({ format: 'typeid', typeidPrefix: 'task' })
		expect(api.generate()).toStartWith('task_')
	})

	test('reads the settings at each call', () => {
		const { api, current } = setup({ format: 'base36' })
		expect(api.generate()).toHaveLength(7)
		current.format = 'ulid'
		expect(api.generate()).toHaveLength(26)
	})

	test('format functions ignore the settings', () => {
		const { api } = setup({ format: 'typeid', typeidPrefix: 'task' })
		expect(api.typeid()).not.toContain('_')
	})
})

describe('one clock for every entry point', () => {
	test('base36, sqids and generate never repeat a second', () => {
		const { api } = setup({ format: 'sqids' })
		const alphabet = ALPHABETS.bech32
		const decode = (id: string) => new Sqids({ alphabet }).decode(id)[0]
		const values = [
			parseInt(api.base36(), 36),
			decode(api.sqids()),
			decode(api.generate()),
			parseInt(api.base36(), 36),
		]
		expect(values).toEqual([SECOND, SECOND + 1, SECOND + 2, SECOND + 3])
	})

	test('v7-based forms keep one order', () => {
		const { api } = setup()
		// 4つの形を ULID に揃えると、作った順に並び、重ならない。
		const ids = [
			uuidToULID(api.uuidv7()),
			api.ulid(),
			api.typeid().toUpperCase(),
			uuidToULID(api.uuidv7()),
		]
		expect([...ids].sort()).toEqual(ids)
		expect(new Set(ids).size).toBe(4)
	})
})

describe('errors', () => {
	const { api } = setup()

	test('rejects unknown options, including typos', () => {
		expect(() => api.sqids({ minLenght: 8 } as never)).toThrow(
			/Unknown option "minLenght"/,
		)
		expect(() => api.typeid({ type: 'task' } as never)).toThrow(
			/Available options: prefix/,
		)
	})

	test('names the function in the message', () => {
		expect(() => api.nanoid({ size: 0 })).toThrow(
			/^Unique ID Generator: nanoid\(\): /,
		)
	})

	test('rejects arguments to functions that take none', () => {
		expect(() =>
			(api.generate as (x: unknown) => string)({ prefix: 'X-' }),
		).toThrow(TypeError)
		expect(() => (api.ulid as (x: unknown) => string)({})).toThrow(
			TypeError,
		)
	})

	test('rejects bad values', () => {
		expect(() => api.base36({ unit: 's' as never })).toThrow(TypeError)
		expect(() => api.sqids({ alphabet: 'abca' })).toThrow(RangeError)
		expect(() => api.nanoid({ alphabet: 42 as never })).toThrow(TypeError)
		expect(() => api.nanoid({ size: 1.5 })).toThrow(RangeError)
		expect(() => api.sqids({ minLength: -1 })).toThrow(RangeError)
		expect(() => api.typeid({ prefix: 'Task' })).toThrow(
			/Invalid TypeID prefix/,
		)
		expect(() => api.sqids('crockford' as never)).toThrow(
			/Options must be an object/,
		)
	})

	test('rejects a bad TypeID prefix in the settings', () => {
		const { api } = setup({ format: 'typeid', typeidPrefix: 'TSK-' })
		expect(() => api.generate()).toThrow(
			/^Unique ID Generator: generate\(\): Invalid TypeID prefix/,
		)
	})
})
