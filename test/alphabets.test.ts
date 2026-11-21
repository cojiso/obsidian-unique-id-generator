import { expect, test } from 'bun:test'
import { ALPHABETS, isSingleCase, resolveAlphabet } from '../src/alphabets'

test('each named alphabet has 32 distinct characters', () => {
	for (const alphabet of Object.values(ALPHABETS)) {
		expect(new Set(alphabet).size).toBe(32)
	}
})

test('resolves names and passes other strings through', () => {
	expect(resolveAlphabet('bech32')).toBe(ALPHABETS.bech32)
	expect(resolveAlphabet('abc')).toBe('abc')
})

test('does not treat inherited property names as alphabet names', () => {
	expect(resolveAlphabet('valueOf')).toBe('valueOf')
})

test('rejects alphabets that are too short or repeat a character', () => {
	expect(() => resolveAlphabet('a')).toThrow()
	expect(() => resolveAlphabet('abca')).toThrow()
})

test('tells whether letters are all one case', () => {
	expect(isSingleCase(ALPHABETS.bech32)).toBe(true)
	expect(isSingleCase(ALPHABETS.rfc4648)).toBe(true)
	expect(isSingleCase('0123456789')).toBe(true)
	expect(isSingleCase('abcABC')).toBe(false)
})
