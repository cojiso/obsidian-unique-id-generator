import { describe, expect, test } from 'bun:test'
import { FORMATS } from '../src/api'
import {
	axisStates,
	changed,
	chooseFormat,
	equivalentCall,
	modalView,
	toChoice,
	toFormat,
} from '../src/choice'

test('every format maps to a choice and back', () => {
	for (const format of FORMATS) {
		expect(toFormat(toChoice(format))).toBe(format)
	}
})

test('axes that do not apply are ignored', () => {
	const short = toChoice('sqids')
	expect(toFormat({ ...short, basis: 'random', encoding: 'ulid' })).toBe(
		'sqids',
	)
	expect(toFormat({ ...toChoice('uuidv4'), encoding: 'typeid' })).toBe(
		'uuidv4',
	)
})

test('shows the call that gives the same result as generate()', () => {
	expect(equivalentCall({ format: 'sqids', typeidPrefix: '' })).toBe(
		"api.sqids({ alphabet: api.alphabets.bech32, minLength: 0, unit: 'second' })",
	)
	expect(equivalentCall({ format: 'base36', typeidPrefix: '' })).toBe(
		"api.base36({ unit: 'second' })",
	)
	expect(equivalentCall({ format: 'nanoid', typeidPrefix: '' })).toBe(
		'api.nanoid({ alphabet: api.alphabets.bech32, size: 16 })',
	)
	expect(equivalentCall({ format: 'ulid', typeidPrefix: 'task' })).toBe(
		'api.ulid()',
	)
	expect(equivalentCall({ format: 'typeid', typeidPrefix: 'task' })).toBe(
		"api.typeid({ prefix: 'task' })",
	)
})

test('axes that other choices decide show the decided value', () => {
	expect(axisStates(toChoice('sqids'))).toEqual({
		ordering: { kind: 'choose', value: 'unordered' },
		basis: { kind: 'fixed', value: 'time' },
		encoding: { kind: 'none' },
	})
	expect(axisStates(toChoice('nanoid'))).toEqual({
		ordering: { kind: 'fixed', value: 'unordered' },
		basis: { kind: 'fixed', value: 'random' },
		encoding: { kind: 'none' },
	})
	expect(axisStates(toChoice('ulid'))).toEqual({
		ordering: { kind: 'fixed', value: 'time-ordered' },
		basis: { kind: 'choose', value: 'time' },
		encoding: { kind: 'choose', value: 'ulid' },
	})
	expect(axisStates(toChoice('uuidv4'))).toEqual({
		ordering: { kind: 'fixed', value: 'unordered' },
		basis: { kind: 'choose', value: 'random' },
		encoding: { kind: 'fixed', value: 'uuid' },
	})
})

describe('chooseFormat', () => {
	test('sets the axes of the chosen format', () => {
		for (const format of FORMATS) {
			expect(toFormat(chooseFormat(toChoice('sqids'), format))).toBe(
				format,
			)
		}
	})

	test('keeps axes the chosen format does not use', () => {
		const start = { ...toChoice('base36') }
		const long = chooseFormat(start, 'ulid')
		expect(long.ordering).toBe('time-ordered')
		expect(chooseFormat(long, 'nanoid').encoding).toBe('ulid')
	})
})

describe('changed', () => {
	test('compares the format, and the prefix only for TypeID', () => {
		expect(
			changed(
				{ format: 'sqids', typeidPrefix: '' },
				{ format: 'ulid', typeidPrefix: '' },
			),
		).toBe(true)
		expect(
			changed(
				{ format: 'sqids', typeidPrefix: 'a' },
				{ format: 'sqids', typeidPrefix: 'b' },
			),
		).toBe(false)
		expect(
			changed(
				{ format: 'typeid', typeidPrefix: 'a' },
				{ format: 'typeid', typeidPrefix: 'b' },
			),
		).toBe(true)
	})
})

describe('modalView', () => {
	const current = { format: 'sqids', typeidPrefix: 'task' } as const

	test('cannot save until something changes', () => {
		const view = modalView(current, toChoice('sqids'), 'task')
		expect(view.canSave).toBe(false)
		expect(view.next).toEqual(current)
		expect(modalView(current, toChoice('ulid'), 'task').canSave).toBe(true)
	})

	test('shows the encoding row only for Long and the prefix row only for TypeID', () => {
		expect(modalView(current, toChoice('sqids'), '').showEncoding).toBe(
			false,
		)
		expect(modalView(current, toChoice('uuidv4'), '').showEncoding).toBe(
			true,
		)
		expect(modalView(current, toChoice('ulid'), '').showPrefix).toBe(false)
		expect(modalView(current, toChoice('typeid'), '').showPrefix).toBe(true)
	})

	test('a bad TypeID prefix blocks saving but keeps a prefix-less preview', () => {
		const view = modalView(current, toChoice('typeid'), 'Task')
		expect(view.prefixIssues).toEqual(['characters'])
		expect(view.canSave).toBe(false)
		expect(view.preview).toEqual({ format: 'typeid', typeidPrefix: '' })
		expect(view.next).toEqual({ format: 'typeid', typeidPrefix: 'task' })
	})

	test('a bad prefix left in the field does not matter for other formats', () => {
		const view = modalView(current, toChoice('ulid'), 'Task')
		expect(view.prefixIssues).toEqual([])
		expect(view.canSave).toBe(true)
		expect(view.next).toEqual({ format: 'ulid', typeidPrefix: 'task' })
	})
})
