export const ALPHABETS = Object.freeze({
	// 小文字だけで、見間違えやすい 1 b i o を含まない。
	bech32: 'qpzry9x8gf2tvdw0s3jn54khce6mua7l',
	// ULID と TypeID が使う文字集合（小文字）。i l o u を含まない。
	crockford: '0123456789abcdefghjkmnpqrstvwxyz',
	// RFC 4648 の base32。
	rfc4648: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
} as const)

// alphabet は文字の並びそのものだけを受け取る。名前も受け取ると、打ち間違えた名前が短い alphabet として通ってしまう。
export function checkAlphabet(alphabet: string): string {
	const chars = [...alphabet]
	if (chars.length < 2) {
		throw new RangeError('The alphabet needs at least 2 characters.')
	}
	if (new Set(chars).size !== chars.length) {
		throw new RangeError('The alphabet must not repeat a character.')
	}
	return alphabet
}
