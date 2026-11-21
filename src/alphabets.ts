export const ALPHABETS = {
	// 小文字だけで、見間違えやすい 1 b i o を含まない。
	bech32: 'qpzry9x8gf2tvdw0s3jn54khce6mua7l',
	// ULID と TypeID が使う文字集合（小文字）。i l o u を含まない。
	crockford: '0123456789abcdefghjkmnpqrstvwxyz',
	// RFC 4648 の base32。
	rfc4648: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
} as const

export type AlphabetName = keyof typeof ALPHABETS

const NAMED: ReadonlyMap<string, string> = new Map(Object.entries(ALPHABETS))

// 名前なら文字集合に置き換え、それ以外は文字列そのものを alphabet として使う。
export function resolveAlphabet(
	alphabet: AlphabetName | (string & {}),
): string {
	const resolved = NAMED.get(alphabet) ?? alphabet
	const chars = [...resolved]
	if (chars.length < 2) {
		throw new Error('The alphabet needs at least 2 characters.')
	}
	if (new Set(chars).size !== chars.length) {
		throw new Error('The alphabet must not repeat a character.')
	}
	return resolved
}

// 英字が大文字だけか小文字だけなら true（英字がなくても true）。このときだけ、ID の大文字小文字を変えても別の ID が同じ文字列にならない。
export function isSingleCase(alphabet: string): boolean {
	return (
		alphabet === alphabet.toLowerCase() ||
		alphabet === alphabet.toUpperCase()
	)
}
