import type { MessageKey } from './catalog'

// French text for the project home screen only. Keys missing here fall back to English on purpose,
// so every other page stays in its existing languages.
export const frenchHomeScreen = {} as const satisfies Partial<Record<MessageKey, string>>

export type FrenchHomeScreenKey = keyof typeof frenchHomeScreen
