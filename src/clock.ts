export type TimeUnit = 'second' | 'millisecond'

// 時刻を整数で返す。前回出した値以下なら前回の値に 1 を足し、同じ時刻に続けて呼んでも重ならないようにする。
// 前回の値は、このインスタンスがある間だけ覚える。秒とミリ秒は別々に覚える。
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
