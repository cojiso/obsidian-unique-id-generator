import { expect, test } from 'bun:test'
import { ALPHABETS } from '../../src/alphabets'
import { nanoid } from '../../src/methods/nanoid'

test('uses the given alphabet and size', () => {
	const id = nanoid(ALPHABETS.bech32, 16)
	expect(id).toHaveLength(16)
	expect([...id].every((c) => ALPHABETS.bech32.includes(c))).toBe(true)
})

test('rejects sizes that are not positive integers', () => {
	expect(() => nanoid('abc', 0)).toThrow(RangeError)
	expect(() => nanoid('abc', 1.5)).toThrow(RangeError)
})
