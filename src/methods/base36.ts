// 整数を base36 にし、先頭を 0 で埋めて width 桁にする。桁が揃うので、文字列として並べても数の順になる。
// 秒を7桁にすると桁が増えるのは 4453-04-05、ミリ秒を9桁にすると 5188-04-22。
export function encodeBase36(n: number, width: number): string {
	if (!Number.isSafeInteger(n) || n < 0) {
		throw new RangeError(`Expected a non-negative safe integer: ${n}`)
	}
	return n.toString(36).padStart(width, '0')
}
