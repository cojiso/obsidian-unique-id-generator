import Sqids from 'sqids'

export interface SqidsOptions {
	alphabet: string
	minLength?: number
}

// Creating a Sqids instance shuffles the alphabet and filters the blocklist, so instances are reused per setting.
const cache = new Map<string, Sqids>()

// Takes a list of integers. Only one time value is passed now, but a list lets numeric input be added without changing the signature.
export function encodeSqids(
	numbers: number[],
	{ alphabet, minLength = 0 }: SqidsOptions,
): string {
	const key = `${minLength}:${alphabet}`
	let sqids = cache.get(key)
	if (!sqids) {
		sqids = new Sqids({ alphabet, minLength })
		cache.set(key, sqids)
	}
	return sqids.encode(numbers)
}
