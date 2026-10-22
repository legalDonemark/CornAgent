import { useI18n } from '../i18n'

const baseLabels = { 'zh-CN': '中文', en: 'EN' } as const

/**
 * 首页顶栏的语言切换器：在访客的原始语言与法语之间切换。
 * 法语只覆盖首页文案，选择保存在本次访问中，下次访问回到默认语言。
 */
export function HomeLanguageSwitcher() {
  const { baseLocale, visitFrench, setVisitFrench, t } = useI18n()
  return (
    <div className="home-language-switcher" role="group" aria-label={t('homeLanguage')}>
      <button
        type="button"
        className="home-language-option"
        lang={baseLocale}
        aria-pressed={!visitFrench}
        title={t('homeLanguageOriginal')}
        onClick={() => setVisitFrench(false)}
      >
        {baseLabels[baseLocale]}
      </button>
      <button
        type="button"
        className="home-language-option"
        lang="fr"
        aria-pressed={visitFrench}
        title={t('homeLanguageFrench')}
        onClick={() => setVisitFrench(true)}
      >
        FR
      </button>
    </div>
  )
}
