import { uuidToULID } from 'ulid'
import { v4, v7 } from 'uuid'

export function uuidV4(): string {
	return v4()
}

// 同じミリ秒の中の順番は uuid が保つ。
export function uuidV7(): string {
	return v7()
}

// 128ビットの先頭に0を2ビット足して130ビットにし、5ビットずつ Crockford base32 にした26文字（大文字）。
export function toULID(uuid: string): string {
	return uuidToULID(uuid)
}

// TypeID の仕様の接頭辞：小文字と _ だけで63文字まで、先頭と末尾は英字。空でもよい。
const TYPEID_PREFIX = /^(?:[a-z](?:[a-z_]{0,61}[a-z])?)?$/

export function isTypeIdPrefix(prefix: string): boolean {
	return TYPEID_PREFIX.test(prefix)
}

export type TypeIdPrefixIssue = 'characters' | 'length' | 'edges'

// prefix がどの決まりから外れているか。設定画面で、外れた決まりだけをエラーに出すために使う。空なら何も外れていない。
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

// TypeID の後半26文字は、ULID を小文字にしたものと同じ。接頭辞が空なら区切りの _ も付けない。
export function toTypeID(prefix: string, uuid: string): string {
	if (!isTypeIdPrefix(prefix)) {
		throw new Error(
			`Invalid TypeID prefix: "${prefix}". Use up to 63 lowercase letters and underscores, starting and ending with a letter.`,
		)
	}
	const suffix = uuidToULID(uuid).toLowerCase()
	return prefix === '' ? suffix : `${prefix}_${suffix}`
}
