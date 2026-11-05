import { describe, expect, it } from 'vitest'
import css from './AddPopover.module.css?raw'

/** All declarations of `selector` inside the 479px media block(s). */
function narrowBlock(): string {
  const start = css.search(/@media\s*\(max-width:\s*479px\)\s*\{/)
  if (start < 0) return ''
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
  }
  return ''
}
function rule(src: string, selector: string): string {
  const esc = selector.replace(/[.]/g, String.raw`\.`)
  return new RegExp(String.raw`(?:^|\s)${esc}\s*\{([^}]*)\}`).exec(src)?.[1] ?? ''
}
const base = css.slice(0, css.search(/@media/) < 0 ? css.length : css.search(/@media/))

describe('AC3: add popover at narrow widths', () => {
  it('AC3: a max-width 479px media block exists', () => {
    expect(narrowBlock()).not.toBe('')
  })

  it('AC3: narrow .popover is a flex column bounded to the viewport', () => {
    const body = rule(narrowBlock(), '.popover')
    expect(body).toMatch(/max-height:/)
    // either explicitly re-declared or inherited from the base rule
    expect(`${rule(base, '.popover')}${body}`).toMatch(/flex-direction:\s*column/)
  })

  it('AC3: narrow .results fills remaining height and scrolls', () => {
    const body = rule(narrowBlock(), '.results')
    // scrolling comes from the base rule unless the sheet overrides it
    expect(`${rule(base, '.results')}${body}`).toMatch(/overflow-y:\s*auto/)
    expect(body).not.toMatch(/overflow(-y)?:\s*(hidden|visible)/)
    expect(body).toMatch(/flex:\s*(1|1 1 auto|1 1 0)/)
    expect(body).toMatch(/min-height:\s*0/)
  })

  it('AC3: desktop values are unchanged', () => {
    const popover = rule(base, '.popover')
    expect(popover).toMatch(/width:\s*360px/)
    expect(popover).toMatch(/max-width:\s*90vw/)
    expect(popover).toMatch(/position:\s*absolute/)
    expect(popover).toMatch(/left:\s*0/)
    expect(rule(base, '.results')).toMatch(/max-height:\s*340px/)
    expect(rule(base, '.results')).toMatch(/overflow-y:\s*auto/)
  })
})
