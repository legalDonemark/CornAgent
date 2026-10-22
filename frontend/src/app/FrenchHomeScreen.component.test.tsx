import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'

import '../styles.css'
import { takePicture } from '../../tests/harness/picture'
import { CornAgentProvider } from '../agent/CornAgentProvider'
import type { CornAgentApiTransport } from '../api/transport'
import { I18nProvider } from '../i18n'
import { translate, type MessageKey } from '../i18n/catalog'
import { frenchHomeScreen } from '../i18n/frenchHomeScreen'
import { AppProviders } from './AppProviders'

// The home screen shell is loaded at run time so every check below is reported by name, failing on
// its own assertions, even before the home screen can be shown in French.
const homeShell = async () => (await import('../App')).Application

// The keys the home screen renders: its navigation, top bar, greeting, composer and project
// introduction. French may cover these and nothing else, so other pages stay English for now.
const HOME_SCREEN_KEYS = [
  'navigation', 'home', 'chats', 'newChat', 'noChats', 'loading', 'loadMore',
  'expandSidebar', 'collapseSidebar', 'pinSidebar', 'resizeSidebar', 'openNavigation', 'closeNavigation',
  'darkTheme', 'lightTheme', 'sidebarExample', 'agentRendering', 'myProfile', 'usageTitle',
  'creatorCelebration', 'chatActions', 'stopBeforeAction', 'waitBeforeAction',
  'noMatchingChats', 'loadMoreChats', 'searchHistory', 'searchHistoryPlaceholder', 'conversationHistory',
  'openingChat', 'historyRefreshFailed', 'conversation', 'askAnything', 'promptInput', 'inputOptions',
  'defaultModel', 'configuredModel', 'chooseFiles', 'addFiles', 'sendMessage', 'stopGeneration', 'pendingFiles',
  'unavailable', 'unavailableHelp', 'modelNotConfigured', 'eventStreamNotConfigured',
  'projectTitle', 'projectDescription', 'projectShortDescription', 'projectLinks', 'projectQuickStart',
  'projectIntegration', 'projectListingBadge',
  'homeLanguage', 'homeLanguageFrench', 'homeLanguageOriginal', 'homeLanguageNote',
] as const satisfies readonly MessageKey[]

// Pages that are not the home screen keep their English text while French is selected.
const OTHER_PAGE_KEYS = [
  'usageSubtitle', 'usageScope', 'usageRuns', 'usageTrendHint', 'exampleTitle',
  'transitionPreviewTitle', 'transitionPreviewHelp', 'transitionPreviewPlayback',
  'editMessage', 'saveAndSend', 'regenerate', 'questionSkipped', 'deepThinking',
] as const satisfies readonly MessageKey[]

const EXPECTED_FRENCH: Partial<Record<MessageKey, string>> = {
  home: 'Accueil',
  chats: 'Discussions',
  newChat: 'Nouvelle conversation',
  askAnything: 'Posez votre question…',
  projectQuickStart: 'Démarrage rapide',
}

function transport(): CornAgentApiTransport {
  return {
    kind: 'cornagent-http',
    get: vi.fn(async (path: string) => (path.startsWith('/agent/status')
      ? {
        available: true,
        unavailable_reason: null,
        file_input: { enabled: true, accepts: [{ mime_type: 'image/png', max_bytes: 5_000_000, max_count: 5 }], max_count: 5, max_total_bytes: 20_000_000 },
      }
      : { data: [], next_cursor: null })),
    mutate: vi.fn(),
    openEventStream: vi.fn(() => () => undefined),
  } as unknown as CornAgentApiTransport
}

async function shell(path: string): Promise<ReactElement> {
  const Application = await homeShell()
  return <I18nProvider>
    <AppProviders>
      <CornAgentProvider transport={transport()} sessionId={null}>
        <Application path={path} sessionId={null} />
      </CornAgentProvider>
    </AppProviders>
  </I18nProvider>
}

async function renderHome() {
  const view = render(await shell('/chat'))
  await screen.findByRole('heading', { level: 1 })
  return view
}

function languageButton(locale: 'fr' | 'base'): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(`.home-language-switcher button[data-locale="${locale === 'fr' ? 'fr' : 'base'}"]`)
  if (!button) throw new Error(`The home top bar has no ${locale} language button.`)
  return button
}

// Everything a visitor can read on the screen: rendered text plus the labels assistive technology
// and tooltips expose.
function visibleText(root: HTMLElement): string {
  const attributes = [...root.querySelectorAll('*')].flatMap((element) =>
    ['aria-label', 'placeholder', 'title', 'alt'].map((name) => element.getAttribute(name) ?? ''))
  return [root.textContent ?? '', ...attributes].join('\n')
}

function picture(size?: { width?: number; height?: number }) {
  takePicture(expect.getState().currentTestName ?? 'french-home-screen', size)
}

beforeEach(() => {
  localStorage.setItem('cornagent.locale', 'en')
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

describe('French home screen', () => {
  it('A visitor can switch the home screen language to French and see the home screen text displayed in French.', async () => {
    const user = userEvent.setup()
    const { container } = await renderHome()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Good (morning|afternoon|evening)/)
    await user.click(languageButton('fr'))

    await waitFor(() => expect(document.documentElement.lang).toBe('fr'))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Bonjour|Bon après-midi|Bonsoir/)
    const text = visibleText(container)
    for (const [key, french] of Object.entries(EXPECTED_FRENCH)) {
      expect(text, `missing the French text for ${key}`).toContain(french)
    }
    expect(languageButton('fr')).toHaveAttribute('aria-pressed', 'true')
    picture()
  })

  it('The French version covers only the home screen; other pages remain untranslated for now.', async () => {
    const user = userEvent.setup()
    await renderHome()
    await user.click(languageButton('fr'))
    await waitFor(() => expect(document.documentElement.lang).toBe('fr'))

    for (const key of Object.keys(frenchHomeScreen) as MessageKey[]) {
      expect(HOME_SCREEN_KEYS, `${key} is not part of the home screen`).toContain(key)
    }
    for (const key of OTHER_PAGE_KEYS) {
      expect(translate('fr', key), `${key} belongs to another page`).toBe(translate('en', key))
    }

    const example = render(await shell('/sidebar'))
    expect(await example.findByRole('heading', { name: translate('en', 'exampleTitle') })).toBeVisible()
    picture()
  })

  it('All text, buttons, and labels visible on the home screen appear correctly in French with no leftover English words.', async () => {
    const user = userEvent.setup()
    const { container } = await renderHome()
    await user.click(languageButton('fr'))
    await waitFor(() => expect(document.documentElement.lang).toBe('fr'))

    const text = visibleText(container)
    for (const key of HOME_SCREEN_KEYS) {
      const english = translate('en', key)
      const french = translate('fr', key)
      expect(french, `${key} has no French text`).not.toBe(english)
      if (english.includes('{')) continue
      expect(text, `${key} is still shown in English`).not.toContain(english)
    }
    expect(text).toContain('Accueil')
    expect(text).toContain('Nouvelle conversation')
    picture()
  })

  it('French special characters such as é, à, and ç display correctly without broken symbols.', async () => {
    const user = userEvent.setup()
    const { container } = await renderHome()
    await user.click(languageButton('fr'))
    await waitFor(() => expect(document.documentElement.lang).toBe('fr'))

    const text = visibleText(container)
    for (const accented of ['é', 'à', 'ç']) {
      expect(text, `no ${accented} on the French home screen`).toContain(accented)
    }
    expect(text).not.toMatch(/�/)
    expect(text).not.toMatch(/Ã[© §¨]|â€™/)
    for (const french of Object.values(frenchHomeScreen)) {
      expect(french).not.toMatch(/�/)
    }
    picture()
  })

  it('A visitor can switch back from French to the original language and the home screen updates correctly.', async () => {
    const user = userEvent.setup()
    const { container } = await renderHome()
    await user.click(languageButton('fr'))
    await waitFor(() => expect(document.documentElement.lang).toBe('fr'))

    await user.click(languageButton('base'))

    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Good (morning|afternoon|evening)/)
    const text = visibleText(container)
    expect(text).toContain('New chat')
    expect(text).not.toContain('Nouvelle conversation')
    expect(languageButton('base')).toHaveAttribute('aria-pressed', 'true')
    picture()
  })

  it("The site remembers a visitor's choice of French only for their current visit, and resets to default on their next visit.", async () => {
    const user = userEvent.setup()
    const first = await renderHome()
    await user.click(languageButton('fr'))
    await waitFor(() => expect(document.documentElement.lang).toBe('fr'))
    expect(localStorage.getItem('cornagent.locale')).toBe('en')
    expect(sessionStorage.getItem('cornagent.locale.visit')).toBe('fr')

    // Same visit: a reload keeps French.
    first.unmount()
    const reloaded = await renderHome()
    expect(document.documentElement.lang).toBe('fr')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Bonjour|Bon après-midi|Bonsoir/)

    // Next visit: the browsing session is gone, so the home screen is back in its default language.
    reloaded.unmount()
    sessionStorage.clear()
    await renderHome()
    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Good (morning|afternoon|evening)/)
    picture()
  })
})
