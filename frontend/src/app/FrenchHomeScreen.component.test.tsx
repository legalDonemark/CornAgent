import { render, screen, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CornAgentProvider } from '../agent/CornAgentProvider'
import type { CornAgentApiTransport } from '../api/transport'
import { translate } from '../i18n/catalog'
import { frenchHomeScreen } from '../i18n/frenchHomeScreen'
import { Application } from '../App'
import { capturePicture } from '../../tests/harness/screenshot'

// 首页法语检查：访客的原始语言为英文，顶栏切换器显示 EN / FR。
const ORIGINAL_PLACEHOLDER = 'Ask anything…'
const FRENCH_PLACEHOLDER = 'Posez votre question…'
const FRENCH_INTRO = 'Conçu avec React et FastAPI. Intégrez-le à votre application.'

function homeTransport(): CornAgentApiTransport {
  return {
    kind: 'cornagent-http',
    get: vi.fn(async (path: string) =>
      path === '/agent/status'
        ? {
            available: true,
            file_input: {
              enabled: true,
              accepts: [{ mime_type: 'image/png', max_bytes: 1_000_000, max_count: 3 }],
              max_count: 3,
              max_total_bytes: 3_000_000,
            },
          }
        : { data: [], next_cursor: null },
    ),
    mutate: vi.fn(),
    openEventStream: vi.fn(),
  } as unknown as CornAgentApiTransport
}

async function openHomeScreen() {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  const transport = homeTransport()
  const user = userEvent.setup()
  const home = (path = '/chat') => (
    <CornAgentProvider transport={transport} sessionId={null}>
      <Application path={path} sessionId={null} />
    </CornAgentProvider>
  )
  const view = render(home())
  await screen.findByPlaceholderText(ORIGINAL_PLACEHOLDER)
  return { user, view, home }
}

const switchTo = async (user: ReturnType<typeof userEvent.setup>, language: 'EN' | 'FR') =>
  user.click(screen.getByRole('button', { name: language }))

function takePicture(root?: Element) {
  capturePicture(expect.getState().currentTestName ?? 'unnamed-check', { root })
}

/** Everything a visitor can read on the screen: text plus the labels assistive software reads. */
function visibleStrings(root: Element): string[] {
  const found = new Set<string>()
  const add = (value: string | null | undefined) => {
    const text = value?.replace(/\s+/g, ' ').trim()
    if (text && /\p{L}/u.test(text)) found.add(text)
  }
  const walk = (element: Element) => {
    if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return
    for (const name of ['aria-label', 'placeholder', 'title', 'alt']) add(element.getAttribute(name))
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) add(node.textContent)
      else if (node.nodeType === Node.ELEMENT_NODE) walk(node as Element)
    }
  }
  walk(root)
  return [...found]
}

const frenchPatterns = Object.values(frenchHomeScreen).map(
  (message) =>
    new RegExp(`^${message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '.+')}$`),
)
// 品牌名与语言切换入口本身保持原样：语言按钮用它所切换到的语言书写。
const notTranslated = new Set(['CornAgent', 'GitHub', 'X', 'EN', 'FR', '切换至中文', 'Switch to English'])

describe('French home screen', () => {
  it('A visitor can switch the home screen language to French and see the home screen text displayed in French.', async () => {
    const { user } = await openHomeScreen()

    await switchTo(user, 'FR')

    expect(document.documentElement.lang).toBe('fr')
    expect(screen.getByRole('button', { name: 'FR' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: /^(Bonjour|Bon après-midi|Bonsoir)$/ })).toBeVisible()
    expect(screen.getByPlaceholderText(FRENCH_PLACEHOLDER)).toBeVisible()
    expect(screen.getByText(FRENCH_INTRO)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Démarrage rapide' })).toBeVisible()
    expect(screen.queryByPlaceholderText(ORIGINAL_PLACEHOLDER)).toBeNull()
    takePicture()
  })

  it('The French version covers only the home screen; other pages remain untranslated for now.', async () => {
    const { user, view, home } = await openHomeScreen()

    await switchTo(user, 'FR')
    expect(screen.getByPlaceholderText(FRENCH_PLACEHOLDER)).toBeVisible()

    view.rerender(home('/sidebar'))

    expect(screen.getByRole('heading', { name: 'Ask AI on your business page' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Ask AI' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'FR' })).toBeNull()
    expect(translate('fr', 'exampleTitle')).toBe('Ask AI on your business page')
    expect(translate('fr', 'transitionPreviewTitle')).toBe('Agent content rendering preview')
    takePicture()
  })

  it('All text, buttons, and labels visible on the home screen appear correctly in French with no leftover English words.', async () => {
    const { user, view } = await openHomeScreen()

    await switchTo(user, 'FR')

    const shell = view.container.querySelector('.cornagent-shell')
    expect(shell).not.toBeNull()
    const leftovers = visibleStrings(shell as Element).filter(
      (value) => !notTranslated.has(value) && !frenchPatterns.some((pattern) => pattern.test(value)),
    )
    expect(leftovers).toEqual([])
    takePicture()
  })

  it('French special characters such as é, à, and ç display correctly without broken symbols.', async () => {
    const { user, view } = await openHomeScreen()

    await switchTo(user, 'FR')

    const shell = view.container.querySelector('.cornagent-shell') as Element
    const readable = [...visibleStrings(shell), ...(shell.textContent ? [shell.textContent] : [])].join(' ')
    expect(readable).toContain('é')
    expect(readable).toContain('à')
    expect(readable).toContain('ç')
    expect(readable).toContain(FRENCH_INTRO)
    expect(readable).toContain('Démarrage rapide')
    // Mojibake and replacement characters never reach the screen.
    expect(readable).not.toMatch(/�|Ã.|â€|Ä.|&eacute;|&agrave;|&ccedil;/)
    expect(readable.normalize('NFC')).toBe(readable)
    takePicture()
  })

  it('A visitor can switch back from French to the original language and the home screen updates correctly.', async () => {
    const { user } = await openHomeScreen()

    await switchTo(user, 'FR')
    expect(screen.getByPlaceholderText(FRENCH_PLACEHOLDER)).toBeVisible()

    await switchTo(user, 'EN')

    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'FR' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByPlaceholderText(ORIGINAL_PLACEHOLDER)).toBeVisible()
    expect(screen.queryByText(FRENCH_INTRO)).toBeNull()
    expect(sessionStorage.getItem('cornagent.locale.visit')).toBeNull()
    takePicture()
  })

  it("The site remembers a visitor's choice of French only for their current visit, and resets to default on their next visit.", async () => {
    const { user, view, home } = await openHomeScreen()

    await switchTo(user, 'FR')
    expect(sessionStorage.getItem('cornagent.locale.visit')).toBe('fr')
    expect(localStorage.getItem('cornagent.locale')).toBeNull()

    // Same visit, new page load: the session keeps French.
    view.unmount()
    const sameVisit: RenderResult = render(home())
    expect(await screen.findByPlaceholderText(FRENCH_PLACEHOLDER)).toBeVisible()

    // Next visit: the browser drops session storage and the home screen is back to default.
    sameVisit.unmount()
    sessionStorage.clear()
    const nextVisit = render(home())
    expect(await screen.findByPlaceholderText(ORIGINAL_PLACEHOLDER)).toBeVisible()
    expect(screen.queryByText(FRENCH_INTRO)).toBeNull()
    expect(document.documentElement.lang).toBe('en')
    takePicture(nextVisit.container)
  })
})
