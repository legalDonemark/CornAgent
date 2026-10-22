import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Takes a picture of the screen a check just proved: the rendered DOM is serialized with the
// project stylesheets and rasterized by the browser already installed on the machine.
const harnessDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = resolve(harnessDir, '..', '..')
const repoDir = resolve(frontendDir, '..')
const picturesDir = join(repoDir, '.constat', 'pictures')
const browsers = [
  process.env.CONSTAT_BROWSER,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter((path): path is string => Boolean(path))

/** Lower-case; runs of anything but letters and digits become one dash; at most 120 characters. */
export function pictureSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '')
}

function inlineStyles(entry: string, seen = new Set<string>()): string {
  const file = resolve(entry)
  if (seen.has(file) || !existsSync(file)) return ''
  seen.add(file)
  return readFileSync(file, 'utf8').replace(
    /@import\s+['"]([^'"]+)['"];?/g,
    (_match, reference: string) => inlineStyles(resolve(dirname(file), reference), seen),
  )
}

function interFontFaces(): string {
  const weights = [400, 500, 600]
  return weights
    .map((weight) => join(frontendDir, 'node_modules/@fontsource/inter/files', `inter-latin-${weight}-normal.woff2`))
    .filter(existsSync)
    .map((file, index) => `@font-face{font-family:Inter;font-style:normal;font-weight:${weights[index]};src:url("file://${file}") format("woff2");}`)
    .join('')
}

/** Rewrite bundler-resolved asset URLs so the standalone picture can load them from disk. */
function resolveAssetUrls(html: string): string {
  return html.replace(/url\(&quot;([^&]+)&quot;\)|url\("([^"]+)"\)/g, (match, encoded: string | undefined, plain: string | undefined) => {
    const value = encoded ?? plain ?? ''
    if (!value.startsWith('/') || value.startsWith('//')) return match
    const candidates = [value, join(repoDir, value), join(frontendDir, value)]
    const file = candidates.find((candidate) => existsSync(candidate))
    if (!file) return match
    const replacement = `url("file://${file}")`
    return encoded === undefined ? replacement : replacement.replace(/"/g, '&quot;')
  })
}

function pictureDocument(): string {
  const root = document.documentElement
  const headStyles = [...document.head.querySelectorAll('style')]
    .map((style) => `<style>${style.textContent ?? ''}</style>`)
    .join('')
  return resolveAssetUrls(`<!doctype html>
<html lang="${root.lang || 'en'}" data-theme="${root.dataset.theme ?? 'light'}">
<head><meta charset="utf-8">
<style>html,body{height:100%;margin:0;}#picture-root,#picture-root>*{height:100%;width:100%;}</style>
<style>${interFontFaces()}</style>
<style>${inlineStyles(join(frontendDir, 'src', 'styles.css'))}</style>
${headStyles}
</head>
<body><div id="picture-root">${document.body.innerHTML}</div></body>
</html>`)
}

/**
 * Save `.constat/pictures/<slug of the check name>.png`. Returns the path, or null when no
 * browser is installed: a missing picture must not turn a passing check red.
 */
export function capturePicture(name: string, { width = 1280, height = 860 } = {}): string | null {
  const browser = browsers.find((path) => existsSync(path))
  const target = join(picturesDir, `${pictureSlug(name)}.png`)
  if (!browser) {
    console.warn(`No browser found for the picture of "${name}"; skipped ${target}.`)
    return null
  }
  mkdirSync(picturesDir, { recursive: true })
  const workDir = mkdtempSync(join(tmpdir(), 'constat-picture-'))
  const page = join(workDir, 'screen.html')
  writeFileSync(page, pictureDocument(), 'utf8')
  execFileSync(
    browser,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--user-data-dir=${join(workDir, 'profile')}`,
      `--window-size=${width},${height}`,
      `--screenshot=${target}`,
      '--virtual-time-budget=4000',
      `file://${page}`,
    ],
    { stdio: 'ignore', timeout: 120000 },
  )
  return target
}
