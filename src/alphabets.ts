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
	// NanoID indexes the alphabet by UTF-16 code unit, so a character made of two units, such as an emoji, would be split into broken halves.
	if (chars.length !== alphabet.length) {
		throw new RangeError(
			'The alphabet must not contain emoji or other characters outside the Basic Multilingual Plane.',
		)
	}
	if (chars.length < 2) {
		throw new RangeError('The alphabet needs at least 2 characters.')
	}
	// NanoID picks characters with random bytes and never finishes with more than 256 characters.
	if (chars.length > 256) {
		throw new RangeError('The alphabet can have at most 256 characters.')
	}
	if (new Set(chars).size !== chars.length) {
		throw new RangeError('The alphabet must not repeat a character.')
	}
	return alphabet
}
