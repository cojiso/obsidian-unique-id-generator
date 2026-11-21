import { expect, test } from 'bun:test'
import { ALPHABETS, checkAlphabet } from '../src/alphabets'

test('each named alphabet has 32 distinct characters', () => {
	for (const alphabet of Object.values(ALPHABETS)) {
		expect(new Set(alphabet).size).toBe(32)
	}
})

test('passes a valid alphabet through as it is', () => {
	expect(checkAlphabet('abc')).toBe('abc')
	expect(checkAlphabet('aAbB')).toBe('aAbB')
})

test('does not read names, so a mistyped name is just characters', () => {
	expect(checkAlphabet('bech23')).toBe('bech23')
})

test('rejects alphabets that are too short or repeat a character', () => {
	expect(() => checkAlphabet('a')).toThrow(RangeError)
	expect(() => checkAlphabet('abca')).toThrow(RangeError)
})
