export const ALPHABETS = Object.freeze({
	// Lowercase only, without the easily confused 1, b, i, and o.
	bech32: 'qpzry9x8gf2tvdw0s3jn54khce6mua7l',
	// The character set of ULID and TypeID, in lowercase. Excludes i, l, o, and u.
	crockford: '0123456789abcdefghjkmnpqrstvwxyz',
	// Base32 from RFC 4648.
	rfc4648: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
} as const)

// Takes only the characters themselves, not an alphabet name, so that a misspelled name cannot pass as a short alphabet.
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
