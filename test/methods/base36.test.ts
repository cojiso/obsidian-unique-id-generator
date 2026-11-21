import { expect, test } from 'bun:test'
import { encodeBase36 } from '../../src/methods/base36'

test('pads Unix seconds to 7 digits', () => {
	expect(encodeBase36(1_763_700_000, 7)).toBe('0t627mo')
	expect(parseInt('0t627mo', 36)).toBe(1_763_700_000)
})

test('keeps string order across the 6-to-7 digit rollover of seconds in 2038', () => {
	expect(new Date(36 ** 6 * 1000).toISOString()).toStartWith('2038-12-24')
	expect(encodeBase36(36 ** 6 - 1, 7) < encodeBase36(36 ** 6, 7)).toBe(true)
})

test('keeps string order across the 8-to-9 digit rollover of milliseconds in 2059', () => {
	expect(new Date(36 ** 8).toISOString()).toStartWith('2059-05-25')
	expect(encodeBase36(36 ** 8 - 1, 9) < encodeBase36(36 ** 8, 9)).toBe(true)
})

test('rejects values that are not non-negative safe integers', () => {
	expect(() => encodeBase36(-1, 7)).toThrow(RangeError)
	expect(() => encodeBase36(1.5, 7)).toThrow(RangeError)
})
