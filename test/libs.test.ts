// 依存ライブラリが読み込めて、期待する形の ID を返すことを確かめる。
import { expect, test } from 'bun:test'
import { customAlphabet } from 'nanoid'
import Sqids from 'sqids'
import { uuidToULID } from 'ulid'
import { v4, v7 } from 'uuid'

test('sqids encodes and decodes', () => {
	const sqids = new Sqids({ alphabet: 'qpzry9x8gf2tvdw0s3jn54khce6mua7l' })
	const id = sqids.encode([1763700000])
	expect(sqids.decode(id)).toEqual([1763700000])
})

test('uuid v4 and v7 have the expected version', () => {
	expect(v4()[14]).toBe('4')
	expect(v7()[14]).toBe('7')
})

test('nanoid uses the given alphabet and size', () => {
	expect(customAlphabet('abc', 16)()).toMatch(/^[abc]{16}$/)
})

test('ulid converts a UUID to 26 Crockford base32 characters', () => {
	expect(uuidToULID(v7())).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/)
})
