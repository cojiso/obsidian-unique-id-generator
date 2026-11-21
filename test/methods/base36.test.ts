import { expect, test } from 'bun:test'
import { encodeBase36 } from '../../src/methods/base36'

test('pads Unix seconds to 7 digits', () => {
	expect(encodeBase36(1_763_700_000)).toBe('0t627mo')
	expect(parseInt('0t627mo', 36)).toBe(1_763_700_000)
})

test('keeps string order across the 6-to-7 digit rollover in 2038', () => {
	const before = encodeBase36(36 ** 6 - 1)
	const after = encodeBase36(36 ** 6)
	expect(new Date(36 ** 6 * 1000).toISOString()).toStartWith('2038-12-24')
	expect(before < after).toBe(true)
})

test('rejects values that are not non-negative safe integers', () => {
	expect(() => encodeBase36(-1)).toThrow(RangeError)
	expect(() => encodeBase36(1.5)).toThrow(RangeError)
})
