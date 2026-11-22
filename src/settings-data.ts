import { FORMATS, type IdSettings } from './api'
import { isTypeIdPrefix } from './methods/uuid'

export type UniqueIdGeneratorSettings = IdSettings

export const DEFAULT_SETTINGS: UniqueIdGeneratorSettings = {
	format: 'sqids',
	typeidPrefix: '',
}

// Saved data can be edited by hand, so only valid values are used and the rest fall back to the defaults.
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
