import { describe, expect, test } from 'bun:test'
import { Clock, type ClockState } from '../src/clock'

function fakeClock(...times: number[]) {
	let i = 0
	return new Clock(() => times[Math.min(i++, times.length - 1)] ?? 0)
}

test('returns Unix seconds by default', () => {
	expect(fakeClock(1_763_700_000_999).next()).toBe(1_763_700_000)
})

test('adds 1 when called again in the same second', () => {
	const clock = fakeClock(1_000_000, 1_000_500, 1_000_900, 5_000_000)
	expect([clock.next(), clock.next(), clock.next(), clock.next()]).toEqual([
		1000, 1001, 1002, 5000,
	])
})

test('keeps increasing when the system time goes back', () => {
	const clock = fakeClock(10_000, 5_000)
	expect([clock.next(), clock.next()]).toEqual([10, 11])
})

test('tracks seconds and milliseconds separately', () => {
	const clock = fakeClock(1_000)
	expect([
		clock.next('millisecond'),
		clock.next('millisecond'),
		clock.next('second'),
	]).toEqual([1000, 1001, 1])
})

describe('with a store', () => {
	function memoryStore(initial?: unknown) {
		let saved = initial
		return {
			load: () => saved,
			save: (state: ClockState) => {
				saved = JSON.parse(JSON.stringify(state))
			},
			get saved() {
				return saved
			},
		}
	}

	test('continues from the saved values in a new clock', () => {
		const store = memoryStore()
		const first = new Clock(() => 1_000_000, store)
		const made = [first.next(), first.next(), first.next()]
		expect(made).toEqual([1000, 1001, 1002])
		// A reload within the same second: the new clock must not reissue 1000 to 1002.
		const second = new Clock(() => 1_000_500, store)
		expect(second.next()).toBe(1003)
	})

	test('keeps seconds and milliseconds apart and saves only finite values', () => {
		const store = memoryStore()
		const clock = new Clock(() => 5_000, store)
		clock.next('millisecond')
		expect(store.saved).toEqual({ millisecond: 5000 })
		clock.next('second')
		expect(store.saved).toEqual({ second: 5, millisecond: 5000 })
	})

	test('ignores saved data that is not a safe integer', () => {
		const store = memoryStore({ second: 'x', millisecond: 1.5 })
		const clock = new Clock(() => 2_000, store)
		expect([clock.next(), clock.next('millisecond')]).toEqual([2, 2000])
	})

	test('moves on with real time once it passes the saved value', () => {
		const store = memoryStore({ second: 10 })
		expect(new Clock(() => 60_000, store).next()).toBe(60)
	})
})
