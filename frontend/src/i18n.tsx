import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/fr'
import { translate, type DisplayLocale, type Locale, type Translator } from './i18n/catalog'
export type { DisplayLocale, Locale } from './i18n/catalog'

interface I18nValue {
  /** 当前展示语言，法语只覆盖首页文案。 */
  locale: DisplayLocale
  /** 访客的原始语言，法语之外的界面与合成演示内容使用它。 */
  baseLocale: Locale
  visitFrench: boolean
  t: Translator
  text: (zh: string, en: string) => string
  toggleLocale: () => void
  /** 首页语言切换；只保存在本次访问中。 */
  setVisitFrench: (french: boolean) => void
}

const I18nContext = createContext<I18nValue | null>(null)
const LOCALE_KEY = 'cornagent.locale'
// 法语是本次访问的选择：保存在 sessionStorage，下次访问回到默认语言。
const VISIT_LOCALE_KEY = 'cornagent.locale.visit'
const syncDayjsLocale = (locale: DisplayLocale) =>
  dayjs.locale(locale === 'zh-CN' ? 'zh-cn' : locale === 'fr' ? 'fr' : 'en')
const fallbackI18n: I18nValue = {
  locale: 'zh-CN',
  baseLocale: 'zh-CN',
  visitFrench: false,
  t: (key, params) => translate('zh-CN', key, params),
  text: (zh) => zh,
  toggleLocale: () => undefined,
  setVisitFrench: () => undefined,
}

function readLocalePreference(): Locale | null {
  try {
    const saved = localStorage.getItem(LOCALE_KEY)
    return saved === 'en' || saved === 'zh-CN' ? saved : null
  } catch {
    return null
  }
}

function readVisitFrench(): boolean {
  try {
    return sessionStorage.getItem(VISIT_LOCALE_KEY) === 'fr'
  } catch {
    return false
  }
}

function systemLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  for (const language of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const base = language?.toLowerCase().split(/[-_]/)[0]
    if (base === 'zh') return 'zh-CN'
    if (base === 'en') return 'en'
  }
  return 'en'
}

function subscribeSystemLocale(onChange: () => void) {
  window.addEventListener('languagechange', onChange)
  return () => window.removeEventListener('languagechange', onChange)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Locale | null>(readLocalePreference)
  const [visitFrench, setVisitFrenchState] = useState(readVisitFrench)
  const osLocale = useSyncExternalStore(subscribeSystemLocale, systemLocale, () => 'en' as const)
  const baseLocale = preference ?? osLocale
  const locale: DisplayLocale = visitFrench ? 'fr' : baseLocale
  useEffect(() => {
    syncDayjsLocale(locale)
    document.documentElement.lang = locale
  }, [locale])
  useEffect(() => {
    if (preference === null) return
    try {
      localStorage.setItem(LOCALE_KEY, preference)
    } catch {
      // Language switching still works when browser storage is unavailable.
    }
  }, [preference])
  const setVisitFrench = useCallback((french: boolean) => {
    setVisitFrenchState(french)
    try {
      // Never stored next to the long-lived preference: French lasts for this visit only.
      if (french) sessionStorage.setItem(VISIT_LOCALE_KEY, 'fr')
      else sessionStorage.removeItem(VISIT_LOCALE_KEY)
    } catch {
      // Language switching still works when browser storage is unavailable.
    }
  }, [])
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      baseLocale,
      visitFrench,
      t: (key, params) => translate(locale, key, params),
      text: (zh, en) => (locale === 'zh-CN' ? zh : en),
      toggleLocale: () => {
        setVisitFrench(false)
        setPreference(baseLocale === 'zh-CN' ? 'en' : 'zh-CN')
      },
      setVisitFrench,
    }),
    [baseLocale, locale, setVisitFrench, visitFrench],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// This hook intentionally shares the provider module so the locale contract stays in one place.
// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nValue {
  return useContext(I18nContext) ?? fallbackI18n
}
