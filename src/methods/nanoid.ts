import { customAlphabet } from 'nanoid'

export function nanoid(alphabet: string, size: number): string {
	if (!Number.isSafeInteger(size) || size < 1) {
		throw new RangeError(`Expected a positive integer size: ${size}`)
	}
	return customAlphabet(alphabet, size)()
}
