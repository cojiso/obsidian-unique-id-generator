import { expect, test } from 'bun:test'
import { DEFAULT_SETTINGS, readSettings } from '../src/settings-data'

test('uses the defaults when nothing is saved', () => {
	expect(readSettings(null)).toEqual(DEFAULT_SETTINGS)
	expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS)
})

test('keeps valid saved values', () => {
	expect(readSettings({ format: 'typeid', typeidPrefix: 'task' })).toEqual({
		format: 'typeid',
		typeidPrefix: 'task',
	})
})

test('replaces broken values with the defaults and drops unknown keys', () => {
	expect(
		readSettings({
			format: 'snowflake',
			typeidPrefix: 'TSK-',
			prefix: 'x',
		}),
	).toEqual(DEFAULT_SETTINGS)
})
