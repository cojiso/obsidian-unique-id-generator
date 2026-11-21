import Sqids from 'sqids'

export interface SqidsOptions {
	alphabet: string
	minLength?: number
}

// Sqids を作るときに alphabet の並べ替えと blocklist の絞り込みが走るので、同じ設定のものは使い回す。
const cache = new Map<string, Sqids>()

// 整数の列を Sqids にする。いまは時刻1つだけを渡すが、数値の入力を足すときのために列で受け取る。
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
