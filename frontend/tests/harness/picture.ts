// Takes the one picture a check is asked for and writes it to `.constat/pictures/<slug>.png`.
//
// The component suite runs in jsdom, which keeps a real DOM but has no layout or raster engine, so
// there is no browser screenshot to take. This renders what the live DOM says a person reads at
// that moment — every visible text run, in document order, indented by nesting, with a pressed
// segmented control drawn as a filled pill — into a PNG with a built-in 5x7 bitmap font.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

// Same slug rule as the check report published by CI: lower-case, runs of anything but letters and
// digits become one dash, no leading or trailing dash, at most 120 characters.
export const pictureSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)

const GLYPHS: Record<string, string> = {
  ' ': '...../...../...../...../...../...../.....',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '"': '.#.#./.#.#./...../...../...../...../.....',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.',
  $: '..#../.####/#.#../.###./..#.#/####./..#..',
  '%': '##.../##..#/...#./..#../.#.../#..##/...##',
  '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',
  "'": '..#../..#../...../...../...../...../.....',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  '*': '...../..#../#.#.#/.###./#.#.#/..#../.....',
  '+': '...../..#../..#../#####/..#../..#../.....',
  ',': '...../...../...../...../...../..#../.#...',
  '-': '...../...../...../#####/...../...../.....',
  '.': '...../...../...../...../...../...../..#..',
  '/': '....#/...#./...#./..#../.#.../.#.../#....',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '#####/...#./..#../...#./....#/#...#/.###.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
  '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '..##./.#.../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/...#./.##..',
  ':': '...../...../..#../...../...../..#../.....',
  ';': '...../...../..#../...../...../..#../.#...',
  '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '=': '...../...../#####/...../#####/...../.....',
  '>': '.#.../..#../...#./....#/...#./..#../.#...',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  '@': '.###./#...#/....#/.##.#/#.#.#/#.#.#/.###.',
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.####',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '#####/..#../..#../..#../..#../..#../#####',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..##/.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  '[': '..##./..#../..#../..#../..#../..#../..##.',
  '\\': '#..../.#.../.#.../..#../...#./...#./....#',
  ']': '.##../..#../..#../..#../..#../..#../.##..',
  '^': '..#../.#.#./#...#/...../...../...../.....',
  _: '...../...../...../...../...../...../#####',
  '`': '.#.../..#../...../...../...../...../.....',
  a: '...../...../.###./....#/.####/#...#/.####',
  b: '#..../#..../#.##./##..#/#...#/#...#/####.',
  c: '...../...../.###./#...#/#..../#...#/.###.',
  d: '....#/....#/.##.#/##..#/#...#/#...#/.####',
  e: '...../...../.###./#...#/#####/#..../.###.',
  f: '..##./.#..#/.#.../###../.#.../.#.../.#...',
  g: '...../...../.####/#...#/#...#/.####/....#/####.',
  h: '#..../#..../#.##./##..#/#...#/#...#/#...#',
  i: '..#../...../.##../..#../..#../..#../.###.',
  j: '...#./...../..##./...#./...#./...#./#..#./.##..',
  k: '#..../#..../#..#./#.#../##.../#.#../#..#.',
  l: '.##../..#../..#../..#../..#../..#../.###.',
  m: '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
  n: '...../...../#.##./##..#/#...#/#...#/#...#',
  o: '...../...../.###./#...#/#...#/#...#/.###.',
  p: '...../...../####./#...#/#...#/####./#..../#....',
  q: '...../...../.####/#...#/#...#/.####/....#/....#',
  r: '...../...../#.##./##..#/#..../#..../#....',
  s: '...../...../.####/#..../.###./....#/####.',
  t: '.#.../.#.../###../.#.../.#.../.#..#/..##.',
  u: '...../...../#...#/#...#/#...#/#..##/.##.#',
  v: '...../...../#...#/#...#/#...#/.#.#./..#..',
  w: '...../...../#...#/#.#.#/#.#.#/#.#.#/.#.#.',
  x: '...../...../#...#/.#.#./..#../.#.#./#...#',
  y: '...../...../#...#/#...#/#...#/.####/....#/.###.',
  z: '...../...../#####/...#./..#../.#.../#####',
  '{': '..##./..#../..#../.#.../..#../..#../..##.',
  '|': '..#../..#../..#../..#../..#../..#../..#..',
  '}': '.##../..#../..#../...#./..#../..#../.##..',
  '~': '...../...../.#..#/#.##./...../...../.....',
  '\u0000': '#####/#...#/#...#/#...#/#...#/#...#/#####', // Unknown character.
}

// Combining marks, drawn in the two rows above the glyph box (a cedilla below it): French accents
// are composed, so é, à, ç, ê and ü each come out of the base letter plus its own mark.
const ABOVE: Record<string, string> = {
  '́': '...#./..#..',
  '̀': '.#.../..#..',
  '̂': '..#../.#.#.',
  '̈': '.#.#./.....',
  '̊': '..#../.#.#.',
  '̃': '.##.#/#.##.',
}
const BELOW: Record<string, string> = { '̧': '..#../.##..' }

// Typographic characters the font has no glyph for, written with the ASCII it stands for.
const PLAIN: Record<string, string> = {
  '…': '...', '’': "'", '‘': "'", '“': '"', '”': '"',
  '—': '-', '–': '-', '·': '.', ' ': ' ', '«': '"', '»': '"',
  'Œ': 'OE', 'œ': 'oe', '€': 'EUR',
}

const CELL_WIDTH = 5
const CELL_HEIGHT = 7
const ACCENT_ROWS = 2
const DESCENDER_ROWS = 2
const LINE_HEIGHT = ACCENT_ROWS + CELL_HEIGHT + DESCENDER_ROWS
const SCALE = 2
const PADDING = 12
const INDENT = 7
const HEADER_LINES = 2

type Rgb = [number, number, number]
const INK: Rgb = [23, 25, 24]
const PAPER: Rgb = [255, 255, 255]
const BAND: Rgb = [45, 45, 45]
const BAND_INK: Rgb = [240, 240, 240]
const PILL_ON: Rgb = [59, 130, 246]
const PILL_OFF: Rgb = [224, 225, 228]
const MUTED: Rgb = [119, 119, 119]

export interface PictureLine {
  text: string
  depth: number
  pill?: 'on' | 'off'
  muted?: boolean
}

/** Every visible text run of `root`, in document order, with its nesting depth. */
export function visibleLines(root: Element): PictureLine[] {
  const lines: PictureLine[] = []
  const walk = (element: Element, depth: number) => {
    if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) return
    if (['SCRIPT', 'STYLE', 'SVG', 'CANVAS', 'IMG'].includes(element.tagName)) return
    const pressed = element.getAttribute('aria-pressed')
    const own = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (pressed !== null && own.length > 0 && own.length <= 12) {
      lines.push({ text: own, depth, pill: pressed === 'true' ? 'on' : 'off' })
      return
    }
    for (const node of element.childNodes) {
      if (node.nodeType === 3) {
        const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (text) lines.push({ text, depth })
      } else if (node.nodeType === 1) {
        walk(node as Element, depth + 1)
      }
    }
    const placeholder = element.getAttribute('placeholder')
    if (placeholder) lines.push({ text: placeholder, depth: depth + 1, muted: true })
  }
  walk(root, 0)
  return lines
}

class Canvas {
  readonly width: number
  readonly height: number
  private readonly pixels: Uint8Array

  constructor(width: number, height: number, background: Rgb) {
    this.width = width
    this.height = height
    this.pixels = new Uint8Array(width * height * 3)
    this.fill(0, 0, width, height, background)
  }

  fill(x: number, y: number, width: number, height: number, color: Rgb) {
    for (let row = Math.max(0, y); row < Math.min(this.height, y + height); row += 1) {
      for (let column = Math.max(0, x); column < Math.min(this.width, x + width); column += 1) {
        const at = (row * this.width + column) * 3
        this.pixels[at] = color[0]
        this.pixels[at + 1] = color[1]
        this.pixels[at + 2] = color[2]
      }
    }
  }

  /** One scaled bitmap row pattern, '#' meaning ink. */
  private pattern(pattern: string, x: number, y: number, color: Rgb) {
    pattern.split('/').forEach((row, rowIndex) => {
      [...row].forEach((cell, columnIndex) => {
        if (cell !== '#') return
        this.fill(x + columnIndex * SCALE, y + rowIndex * SCALE, SCALE, SCALE, color)
      })
    })
  }

  text(value: string, x: number, y: number, color: Rgb): number {
    let cursor = x
    for (const character of [...value].flatMap((c) => [...(PLAIN[c] ?? c)])) {
      const [base, ...marks] = [...character.normalize('NFD')]
      this.pattern(GLYPHS[base] ?? GLYPHS['\u0000'], cursor, y + ACCENT_ROWS * SCALE, color)
      for (const mark of marks) {
        if (ABOVE[mark]) this.pattern(ABOVE[mark], cursor, y, color)
        if (BELOW[mark]) this.pattern(BELOW[mark], cursor, y + (ACCENT_ROWS + CELL_HEIGHT) * SCALE, color)
      }
      cursor += (CELL_WIDTH + 1) * SCALE
    }
    return cursor - x
  }

  png(): Buffer {
    const raw = Buffer.alloc((this.width * 3 + 1) * this.height)
    for (let row = 0; row < this.height; row += 1) {
      const at = row * (this.width * 3 + 1)
      raw[at] = 0
      Buffer.from(this.pixels.subarray(row * this.width * 3, (row + 1) * this.width * 3)).copy(raw, at + 1)
    }
    const header = Buffer.alloc(13)
    header.writeUInt32BE(this.width, 0)
    header.writeUInt32BE(this.height, 4)
    header[8] = 8
    header[9] = 2
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ])
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(data: Buffer): number {
  let value = 0xffffffff
  for (const byte of data) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, checksum])
}

const textWidth = (value: string) =>
  [...value].flatMap((c) => [...(PLAIN[c] ?? c)]).length * (CELL_WIDTH + 1) * SCALE

/**
 * Writes `.constat/pictures/<slug of name>.png`: the picture the check named `name` takes of the
 * screen it just asserted on. Returns the path written.
 */
export function takePicture(name: string, root: Element = document.body): string {
  const lines = visibleLines(root)
  const caption = 'Rendered from the live DOM at the moment this check passed (jsdom has no layout engine).'
  const header: PictureLine[] = [{ text: name, depth: 0 }, { text: caption, depth: 0, muted: true }]
  const widest = Math.max(
    ...header.map((line) => textWidth(line.text)),
    ...lines.map((line) => textWidth(line.text) + line.depth * INDENT * SCALE),
    320,
  )
  const width = Math.min(widest + PADDING * 2 + 20, 1600)
  const lineStep = (LINE_HEIGHT + 3) * SCALE
  const height = PADDING * 2 + (HEADER_LINES + lines.length) * lineStep + PADDING
  const canvas = new Canvas(width, height, PAPER)
  canvas.fill(0, 0, width, PADDING * 2 + HEADER_LINES * lineStep, BAND)
  header.forEach((line, index) => {
    canvas.text(line.text, PADDING, PADDING + index * lineStep, line.muted ? [170, 170, 170] : BAND_INK)
  })
  lines.forEach((line, index) => {
    const y = PADDING * 2 + (HEADER_LINES + index) * lineStep + PADDING
    const x = PADDING + line.depth * INDENT * SCALE
    if (line.pill) {
      const pillWidth = textWidth(line.text) + 8 * SCALE
      canvas.fill(x - 2 * SCALE, y - SCALE, pillWidth, (LINE_HEIGHT + 2) * SCALE, line.pill === 'on' ? PILL_ON : PILL_OFF)
      canvas.text(line.text, x + 2 * SCALE, y, line.pill === 'on' ? PAPER : INK)
      return
    }
    canvas.text(line.text, x, y, line.muted ? MUTED : INK)
  })
  const directory = resolve(cwd(), '.constat', 'pictures')
  mkdirSync(directory, { recursive: true })
  const path = resolve(directory, `${pictureSlug(name)}.png`)
  writeFileSync(path, canvas.png())
  return path
}
