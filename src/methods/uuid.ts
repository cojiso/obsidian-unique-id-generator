import { uuidToULID } from 'ulid'
import { v4, v7 } from 'uuid'

export function uuidV4(): string {
	return v4()
}

// The uuid library keeps the order within the same millisecond.
export function uuidV7(): string {
	return v7()
}

// Pads the 128 bits with two leading zero bits to 130 bits and encodes them 5 bits at a time in Crockford base32, giving 26 uppercase characters.
export function toULID(uuid: string): string {
	return uuidToULID(uuid)
}

// The TypeID spec's prefix: up to 63 lowercase letters and underscores, starting and ending with a letter. It may be empty.
const TYPEID_PREFIX = /^(?:[a-z](?:[a-z_]{0,61}[a-z])?)?$/

export function isTypeIdPrefix(prefix: string): boolean {
	return TYPEID_PREFIX.test(prefix)
}

export type TypeIdPrefixIssue = 'characters' | 'length' | 'edges'

// Which rules the prefix breaks, so that the modal can show only those in the error. An empty array means it breaks none.
export function typeIdPrefixIssues(prefix: string): TypeIdPrefixIssue[] {
	const issues: TypeIdPrefixIssue[] = []
	if (!/^[a-z_]*$/.test(prefix)) {
		issues.push('characters')
	}
	if (prefix.length > 63) {
		issues.push('length')
	}
	if (prefix.startsWith('_') || prefix.endsWith('_')) {
		issues.push('edges')
	}
	return issues
}

// The 26-character suffix of a TypeID is the lowercase ULID. With an empty prefix, the _ separator is omitted too.
export function toTypeID(prefix: string, uuid: string): string {
	if (!isTypeIdPrefix(prefix)) {
		throw new Error(
			`Invalid TypeID prefix: "${prefix}". Use up to 63 lowercase letters and underscores, starting and ending with a letter.`,
		)
	}
	const suffix = uuidToULID(uuid).toLowerCase()
	return prefix === '' ? suffix : `${prefix}_${suffix}`
}
