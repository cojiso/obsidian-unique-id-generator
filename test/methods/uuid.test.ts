import { describe, expect, test } from 'bun:test'
import { decodeTime } from 'ulid'
import {
	isTypeIdPrefix,
	toTypeID,
	toULID,
	typeIdPrefixIssues,
	uuidV4,
	uuidV7,
} from '../../src/methods/uuid'

interface ValidCase {
	name: string
	typeid: string
	prefix: string
	uuid: string
}

interface InvalidCase {
	name: string
	typeid: string
}

async function loadFixture<T>(name: string): Promise<T[]> {
	const text = await Bun.file(
		new URL(`../fixtures/typeid/${name}`, import.meta.url),
	).text()
	return Bun.YAML.parse(text) as T[]
}

const valid = await loadFixture<ValidCase>('valid.yml')
const invalid = await loadFixture<InvalidCase>('invalid.yml')

test('makes UUID v4 and v7', () => {
	expect(uuidV4()[14]).toBe('4')
	expect(uuidV7()[14]).toBe('7')
})

test('ULID form keeps the v7 milliseconds', () => {
	const before = Date.now()
	const ulid = toULID(uuidV7())
	const after = Date.now()
	expect(ulid).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/)
	expect(decodeTime(ulid)).toBeGreaterThanOrEqual(before)
	expect(decodeTime(ulid)).toBeLessThanOrEqual(after)
})

describe('TypeID spec valid.yml', () => {
	test.each(valid.map((c) => [c.name, c] as const))('%s', (_, c) => {
		expect(toTypeID(c.prefix, c.uuid)).toBe(c.typeid)
	})
})

// invalid.yml は TypeID の文字列を読み取るためのテストで、このプラグインは読み取らない。接頭辞が理由のものだけを、接頭辞の確かめに使う。
// prefix-empty は後半が空なのが理由で、接頭辞 "prefix" 自体は正しい。
describe('TypeID spec invalid.yml prefixes', () => {
	const cases = invalid.filter(
		(c) => c.name.startsWith('prefix-') && c.name !== 'prefix-empty',
	)

	test('covers the prefix cases', () => {
		expect(cases.length).toBeGreaterThanOrEqual(8)
	})

	test.each(cases.map((c) => [c.name, c] as const))('%s', (_, c) => {
		const prefix = c.typeid.slice(0, c.typeid.lastIndexOf('_'))
		expect(isTypeIdPrefix(prefix)).toBe(false)
		expect(() => toTypeID(prefix, uuidV7())).toThrow()
	})
})

test('omits the separator when the prefix is empty', () => {
	expect(toTypeID('', uuidV7())).toMatch(/^[0-7][0-9a-hjkmnp-tv-z]{25}$/)
})

describe('typeIdPrefixIssues', () => {
	test('names each rule the prefix breaks', () => {
		expect(typeIdPrefixIssues('task')).toEqual([])
		expect(typeIdPrefixIssues('')).toEqual([])
		expect(typeIdPrefixIssues('Task')).toEqual(['characters'])
		expect(typeIdPrefixIssues('a'.repeat(64))).toEqual(['length'])
		expect(typeIdPrefixIssues('task_')).toEqual(['edges'])
		expect(typeIdPrefixIssues('_Task-')).toEqual(['characters', 'edges'])
		expect(typeIdPrefixIssues(`_${'a'.repeat(63)}`)).toEqual([
			'length',
			'edges',
		])
	})

	test('agrees with isTypeIdPrefix on the spec cases and more', () => {
		const prefixes = [
			...valid.map((c) => c.prefix),
			...invalid.map((c) =>
				c.typeid.slice(0, Math.max(0, c.typeid.lastIndexOf('_'))),
			),
			'a',
			'a_b',
			'_',
			'__',
			'a'.repeat(63),
			'a'.repeat(64),
			'task-type',
			'tâsk',
		]
		for (const prefix of prefixes) {
			expect(typeIdPrefixIssues(prefix).length === 0).toBe(
				isTypeIdPrefix(prefix),
			)
		}
	})
})
