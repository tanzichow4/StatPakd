import { describe, expect, it } from 'vitest'

const sheets = import.meta.glob('../components/**/*.module.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Declarations inside the first max-width: 1023px media block of a sheet. */
function touchBlock(name: string): string {
  const css = sheets[`../components/${name}.module.css`] ?? ''
  const start = css.search(/@media\s*\(max-width:\s*1023px\)\s*\{/)
  if (start < 0) return ''
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
  }
  return ''
}

function baseOf(name: string): string {
  const css = sheets[`../components/${name}.module.css`] ?? ''
  const at = css.search(/@media\s*\(max-width:\s*1023px\)/)
  return at < 0 ? css : css.slice(0, at)
}

const cases: [string, string][] = [
  ['picker/EntityCard', '.remove'],
  ['ui/IconButton', '.btn'],
  ['picker/AddCard', '.card'],
  ['picker/AddPopover', '.search'],
  ['picker/AddPopover', '.chip'],
  ['picker/AddPopover', '.ctaAdd'],
  ['picker/AddPopover', '.ctaRemove'],
  ['picker/AddPopover', '.done'],
  ['nav/GlobalNav', '.league'],
  ['ui/Select', '.select'],
  ['ui/SegmentedControl', '.item'],
]

describe('T14: touch targets at max-width 1023px (AC6, AC7)', () => {
  it.each(cases)('%s has a 40px minimum for %s', (name, selector) => {
    const block = touchBlock(name)
    expect(block).toContain(selector)
    expect(block).toMatch(/(?:^|[^\d])40px/)
  })

  it.each(cases)('%s keeps desktop rules outside the media block (%s)', (name) => {
    expect(baseOf(name)).not.toMatch(/(?:^|[^\d.])40px/)
  })
})
