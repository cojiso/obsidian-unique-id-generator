export type TimeUnit = 'second' | 'millisecond'

export type ClockState = Partial<Record<TimeUnit, number>>

// Where the last values are kept between sessions. The plugin uses the vault's localStorage, so the counter is per device and per vault.
export interface ClockStore {
	load(): unknown
	save(state: ClockState): void
}

// Returns the time as an integer. If it is not greater than the last value returned, returns the last value plus 1, so that calls within the same second or millisecond never repeat a value.
// Many calls in one second push the value ahead of real time. With a store, the last values survive a plugin reload or an app restart, so the next session continues from them instead of reissuing values already used.
// Seconds and milliseconds are tracked separately.
export class Clock {
	private readonly now: () => number
	private readonly store: ClockStore | undefined
	private readonly last: Record<TimeUnit, number> = {
		second: Number.NEGATIVE_INFINITY,
		millisecond: Number.NEGATIVE_INFINITY,
	}

	constructor(now: () => number = Date.now, store?: ClockStore) {
		this.now = now
		this.store = store
		const saved = store?.load()
		if (typeof saved === 'object' && saved !== null) {
			for (const unit of ['second', 'millisecond'] as const) {
				const value: unknown = (saved as Record<string, unknown>)[unit]
				// Ignore anything that isn't a plausible value, such as data edited by hand.
				if (typeof value === 'number' && Number.isSafeInteger(value)) {
					this.last[unit] = value
				}
			}
		}
	}

	next(unit: TimeUnit = 'second'): number {
		const ms = this.now()
		const time = unit === 'second' ? Math.floor(ms / 1000) : ms
		const value = Math.max(time, this.last[unit] + 1)
		this.last[unit] = value
		this.store?.save(this.state())
		return value
	}

	// Only finite values, since the initial -Infinity can't be serialized.
	private state(): ClockState {
		const state: ClockState = {}
		for (const unit of ['second', 'millisecond'] as const) {
			if (Number.isFinite(this.last[unit])) {
				state[unit] = this.last[unit]
			}
		}
		return state
	}
}
