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

// Sqids は alphabet の1文字を区切りに取っておくので31進数で書き、先頭に1文字足す。8文字なのは 31^6 秒（1998-02-15）から 31^7 秒（2841-11-03）の手前まで。
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
