import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Takes a real picture of the screen a component test just rendered: the jsdom document (including
// the stylesheets vitest injected) is written out as a standalone page and handed to the headless
// browser already installed on the machine. No extra dependency and no browser download.
const BROWSERS = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

export function pictureSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}

export function takePicture(name: string, size: { width?: number; height?: number } = {}): string | null {
  const slug = pictureSlug(name)
  const browser = BROWSERS.find((candidate): candidate is string => Boolean(candidate) && existsSync(candidate))
  if (!browser) {
    console.warn(`No headless browser found, so "${name}" ran without taking its picture.`)
    return null
  }
  const lang = document.documentElement.lang || 'en'
  const page = join(tmpdir(), `${slug}.html`)
  // The charset declaration keeps French accents intact once the file is read back from disk.
  writeFileSync(
    page,
    `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">${document.head.innerHTML}</head><body>${document.body.innerHTML}</body></html>`,
    'utf8',
  )
  // `.constat/pictures` beside the part that ran (what CI's check report reads) and at the repo root.
  const directories = [resolve(process.cwd(), '.constat/pictures'), resolve(process.cwd(), '..', '.constat/pictures')]
  const files = directories.map((directory) => {
    mkdirSync(directory, { recursive: true })
    return join(directory, `${slug}.png`)
  })
  execFileSync(browser, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=ffffff',
    `--window-size=${size.width ?? 1280},${size.height ?? 860}`,
    '--virtual-time-budget=2000',
    `--screenshot=${files[0]}`,
    `file://${page}`,
  ], { stdio: 'ignore', timeout: 90_000 })
  for (const file of files.slice(1)) copyFileSync(files[0], file)
  return files[0]
}
