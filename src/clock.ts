export type TimeUnit = 'second' | 'millisecond'

// Returns the time as an integer. If it is not greater than the last value returned, returns the last value plus 1, so that calls within the same second or millisecond never repeat a value.
// The last value lives only as long as this instance, and seconds and milliseconds are tracked separately.
export class Clock {
	private readonly now: () => number
	private readonly last: Record<TimeUnit, number> = {
		second: Number.NEGATIVE_INFINITY,
		millisecond: Number.NEGATIVE_INFINITY,
	}

	constructor(now: () => number = Date.now) {
		this.now = now
	}

	next(unit: TimeUnit = 'second'): number {
		const ms = this.now()
		const time = unit === 'second' ? Math.floor(ms / 1000) : ms
		const value = Math.max(time, this.last[unit] + 1)
		this.last[unit] = value
		return value
	}
}
