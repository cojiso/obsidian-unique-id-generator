// 整数を base36 にし、先頭を 0 で埋めて width 桁にする。桁が揃うので、文字列として並べても数の順になる。
// 秒を7桁にすると、桁が増えるのは 4453-04-05。
export function encodeBase36(n: number, width = 7): string {
	if (!Number.isSafeInteger(n) || n < 0) {
		throw new RangeError(`Expected a non-negative safe integer: ${n}`)
	}
	return n.toString(36).padStart(width, '0')
}
