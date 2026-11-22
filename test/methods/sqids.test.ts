import { expect, test } from 'bun:test'
import Sqids from 'sqids'
import { ALPHABETS } from '../../src/alphabets'
import { encodeSqids } from '../../src/methods/sqids'

const alphabet = ALPHABETS.bech32

test('decodes back to the same seconds with the same alphabet', () => {
	const seconds = 1_763_700_000
	const id = encodeSqids([seconds], { alphabet })
	expect(new Sqids({ alphabet }).decode(id)).toEqual([seconds])
})

// Sqids reserves one alphabet character as a separator, so it writes the number in base 31 and adds one leading character. IDs have 8 characters from 31^6 seconds (1998-02-15) up to, but not including, 31^7 seconds (2841-11-03).
test('uses 8 characters from the alphabet for seconds from 1998 to 2841', () => {
	for (const seconds of [31 ** 6, 1_763_700_000, 31 ** 7 - 1]) {
		const id = encodeSqids([seconds], { alphabet })
		expect(id).toHaveLength(8)
		expect([...id].every((c) => alphabet.includes(c))).toBe(true)
	}
})

test('respects minLength', () => {
	expect(encodeSqids([1], { alphabet, minLength: 12 })).toHaveLength(12)
})

test('gives the same ID for the same input', () => {
	expect(encodeSqids([42], { alphabet })).toBe(
		encodeSqids([42], { alphabet }),
	)
})
