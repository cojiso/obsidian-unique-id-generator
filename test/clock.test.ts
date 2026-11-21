import { expect, test } from 'bun:test'
import { Clock } from '../src/clock'

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
