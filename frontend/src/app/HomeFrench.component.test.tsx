import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { frenchHomeScreen } from '../i18n/catalog'
import { takePicture } from '../../tests/harness/picture'

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

function stubServer() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/auth/session')) return json({ enabled: false, mode: null, user_id: 'local' })
    if (url.includes('/agent/status')) {
      return json({ data: { available: true, file_input: { enabled: true, accepts: ['image/png'], max_count: 3, max_total_bytes: 1000 } } })
    }
    if (url.includes('/sessions')) return json({ data: [], next_cursor: null })
    return json({ data: null })
  }))
}

/** The home screen as a visitor whose browser asks for English first reaches it. */
async function openHome(path = '/chat') {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.spyOn(Date.prototype, 'getHours').mockReturnValue(9)
  stubServer()
  window.history.replaceState({}, '', path)
  const view = render(<App />)
  await screen.findByTestId('agent-chat-page')
  return { view, user: userEvent.setup() }
}

const french = () => screen.getByRole('button', { name: 'FR' })
const english = () => screen.getByRole('button', { name: 'EN' })
const topBar = () => within(document.querySelector('.agent-chat-header') as HTMLElement)

describe('French home screen', () => {
  it('A visitor can switch the home screen language to French and see the home screen text displayed in French.', async () => {
    const { user } = await openHome()
    expect(screen.getByRole('heading', { name: 'Good morning' })).toBeInTheDocument()

    await user.click(french())

    expect(screen.getByRole('heading', { name: 'Bonjour' })).toBeInTheDocument()
    expect(topBar().getByText('Nouvelle conversation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accueil' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Poser une question…')).toBeInTheDocument()
    expect(screen.getByText('Conçu avec React et FastAPI. Intégrez-le à votre application.')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('fr')
    takePicture('French home screen > A visitor can switch the home screen language to French and see the home screen text displayed in French.')
  })

  it('The French version covers only the home screen; other pages remain untranslated for now.', async () => {
    const { user } = await openHome()
    await user.click(french())
    expect(screen.getByRole('heading', { name: 'Bonjour' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Exemple de panneau latéral' }))

    expect(await screen.findByRole('heading', { name: 'Ask AI on your business page' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'FR' })).not.toBeInTheDocument()
    takePicture('French home screen > The French version covers only the home screen; other pages remain untranslated for now.')
  })

  it('All text, buttons, and labels visible on the home screen appear correctly in French with no leftover English words.', async () => {
    const { user } = await openHome()
    await user.click(french())

    // Names the product, its author and the language codes own; every other word a visitor reads on
    // this screen has to come out of the French dictionary.
    const ownNames = ['cornagent', 'made by xiaotongyu.com', 'en', 'fr', 'github', 'x']
    const frenchText = new Set<string>([...Object.values(frenchHomeScreen), 'Bonjour'])
    const untranslated = (text: string | null) =>
      Boolean(text) && !ownNames.includes(text!.trim().toLowerCase()) && !frenchText.has(text!.trim())
    const shown = (element: Element) => !element.closest('[aria-hidden="true"], [hidden]')

    const leftovers = [...document.querySelectorAll('.app-shell *')]
      .filter(shown)
      .flatMap((element) => [...element.childNodes])
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => (node.textContent ?? '').trim())
      .filter((text) => text.length > 0 && untranslated(text))
    const placeholders = [...document.querySelectorAll<HTMLTextAreaElement>('.app-shell [placeholder]')]
      .map((element) => element.placeholder)
      .filter(untranslated)
    const labels = [...document.querySelectorAll('.app-shell button, .app-shell a, .app-shell textarea, .app-shell [role="group"]')]
      .filter(shown)
      .flatMap((element) => [element.getAttribute('aria-label'), element.getAttribute('title')])
      // The sidebar's own language button names its target language in that language's script.
      .filter((text) => untranslated(text) && !/[一-鿿]/.test(text ?? ''))

    expect({ leftovers, placeholders, labels }).toEqual({ leftovers: [], placeholders: [], labels: [] })
    takePicture('French home screen > All text, buttons, and labels visible on the home screen appear correctly in French with no leftover English words.')
  })

  it('French special characters such as é, à, and ç display correctly without broken symbols.', async () => {
    const { user } = await openHome()
    await user.click(french())

    const read = document.querySelector('.app-shell')?.textContent ?? ''
    expect(read).toContain('é')
    expect(read).toContain('à')
    expect(read).toContain('ç')
    expect(read).not.toMatch(/�|Ã©|Ã |Ã§|â€/)
    for (const value of Object.values(frenchHomeScreen)) expect(value).toBe(value.normalize('NFC'))
    expect(screen.getByRole('link', { name: 'Démarrage rapide' })).toBeInTheDocument()
    takePicture('French home screen > French special characters such as é, à, and ç display correctly without broken symbols.')
  })

  it('A visitor can switch back from French to the original language and the home screen updates correctly.', async () => {
    const { user } = await openHome()
    await user.click(french())
    expect(screen.getByRole('heading', { name: 'Bonjour' })).toBeInTheDocument()

    await user.click(english())

    expect(screen.getByRole('heading', { name: 'Good morning' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask anything…')).toBeInTheDocument()
    expect(screen.queryByText('Nouvelle conversation')).not.toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    takePicture('French home screen > A visitor can switch back from French to the original language and the home screen updates correctly.')
  })

  it("The site remembers a visitor's choice of French only for their current visit, and resets to default on their next visit.", async () => {
    const { view, user } = await openHome()
    await user.click(french())
    expect(sessionStorage.getItem('cornagent.locale.session')).toBe('fr')
    expect(localStorage.getItem('cornagent.locale')).not.toBe('fr')

    // Same visit, another page load: the choice is still there.
    view.unmount()
    const sameVisit = render(<App />)
    expect(await screen.findByRole('heading', { name: 'Bonjour' })).toBeInTheDocument()

    // The next visit starts with an empty session store, and the home screen is back to default.
    sameVisit.unmount()
    sessionStorage.clear()
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Good morning' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask anything…')).toBeInTheDocument()
    takePicture("French home screen > The site remembers a visitor's choice of French only for their current visit, and resets to default on their next visit.")
  })
})
