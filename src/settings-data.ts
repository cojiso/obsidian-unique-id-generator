import { FORMATS, type IdSettings } from './api'
import { isTypeIdPrefix } from './methods/uuid'

export type UniqueIdGeneratorSettings = IdSettings

export const DEFAULT_SETTINGS: UniqueIdGeneratorSettings = {
	format: 'sqids',
	typeidPrefix: '',
}

// 保存されたデータは手で書き換えられることもあるので、正しい値だけを使い、ほかは既定に戻す。
export function readSettings(data: unknown): UniqueIdGeneratorSettings {
	const stored: Record<string, unknown> =
		typeof data === 'object' && data !== null ? { ...data } : {}
	const format =
		FORMATS.find((f) => f === stored.format) ?? DEFAULT_SETTINGS.format
	const typeidPrefix =
		typeof stored.typeidPrefix === 'string' &&
		isTypeIdPrefix(stored.typeidPrefix)
			? stored.typeidPrefix
			: DEFAULT_SETTINGS.typeidPrefix
	return { format, typeidPrefix }
}
