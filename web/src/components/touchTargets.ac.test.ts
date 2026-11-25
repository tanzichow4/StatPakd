import { describe, expect, it } from 'vitest'
import entityCard from './picker/EntityCard.module.css?raw'
import iconButton from './ui/IconButton.module.css?raw'
import addCard from './picker/AddCard.module.css?raw'
import addPopover from './picker/AddPopover.module.css?raw'
import globalNav from './nav/GlobalNav.module.css?raw'
import select from './ui/Select.module.css?raw'
import segmented from './ui/SegmentedControl.module.css?raw'
import tabs from './ui/Tabs.module.css?raw'
import statGroup from './sidebar/StatGroup.module.css?raw'
import addStatMenu from './sidebar/AddStatMenu.module.css?raw'
import axisControls from './compare/AxisControls.module.css?raw'
import chip from './ui/Chip.module.css?raw'
import rosterTable from './teams/RosterTable.module.css?raw'
import weeks from './weeks/Weeks.module.css?raw'
import totals from './weeks/TotalsPanel.module.css?raw'

interface Rule {
  selectors: string[]
  body: string
}

/** Split CSS text into flat rules (no at-rule handling). */
function rules(src: string): Rule[] {
  const out: Rule[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    out.push({ selectors: m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')), body: m[2] })
  }
  return out
}

/** Inner text of every `@media (max-width: 1023px)` block; the rest is the base CSS. */
function split(css: string): { media: string; base: string } {
  let media = ''
  let base = ''
  let i = 0
  const re = /@media\s*\(\s*max-width:\s*1023(?:\.\d+)?px\s*\)\s*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) {
    base += css.slice(i, m.index)
    let depth = 1
    let j = re.lastIndex
    for (; j < css.length && depth > 0; j++) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
    }
    media += css.slice(re.lastIndex, j - 1)
    i = j
    re.lastIndex = j
  }
  base += css.slice(i)
  return { media, base }
}

function px(body: string, prop: string): number | null {
  const m = new RegExp(String.raw`(?:^|[;\s])${prop}:\s*([\d.]+)(px|rem)\b`).exec(body)
  if (!m) return null
  return Number(m[1]) * (m[2] === 'rem' ? 16 : 1)
}

/** Media rules whose selector is `sel` or ends with ` sel` (variants like `.dark .item`). */
function mediaRules(css: string, sel: string): Rule[] {
  return rules(split(css).media).filter((r) =>
    r.selectors.some((s) => s === sel || s.endsWith(` ${sel}`)),
  )
}

interface Target {
  name: string
  css: string
  sel: string
  width: boolean
}
const targets: Target[] = [
  { name: 'EntityCard remove', css: entityCard, sel: '.remove', width: true },
  { name: 'IconButton', css: iconButton, sel: '.btn', width: true },
  { name: 'AddCard', css: addCard, sel: '.card', width: false },
  { name: 'AddPopover search', css: addPopover, sel: '.search', width: false },
  { name: 'AddPopover done', css: addPopover, sel: '.done', width: true },
  { name: 'AddPopover position chip', css: addPopover, sel: '.chip', width: true },
  { name: 'AddPopover ctaAdd', css: addPopover, sel: '.ctaAdd', width: false },
  { name: 'AddPopover ctaRemove', css: addPopover, sel: '.ctaRemove', width: false },
  { name: 'GlobalNav league', css: globalNav, sel: '.league', width: true },
  { name: 'GlobalNav playoffs', css: globalNav, sel: '.playoffs', width: false },
  { name: 'Select', css: select, sel: '.select', width: false },
  { name: 'SegmentedControl item', css: segmented, sel: '.item', width: true },
  { name: 'Tabs tab', css: tabs, sel: '.tab', width: true },
  { name: 'StatGroup row', css: statGroup, sel: '.row', width: false },
  { name: 'StatGroup add', css: statGroup, sel: '.add', width: false },
  { name: 'AddStatMenu item', css: addStatMenu, sel: '.item', width: false },
  { name: 'AxisControls select', css: axisControls, sel: '.select', width: false },
  { name: 'AxisControls reset', css: axisControls, sel: '.reset', width: true },
  { name: 'team Chip', css: chip, sel: '.chip', width: true },
  { name: 'RosterTable sortButton', css: rosterTable, sel: '.sortButton', width: true },
  { name: 'Week shortcut', css: weeks, sel: '.shortcut', width: true },
  { name: 'Week trend checkbox', css: weeks, sel: '.check', width: false },
  { name: 'Totals stat button', css: totals, sel: '.pick', width: true },
]

/** Declared px values of the given properties across the media rules for the target. */
function declared(t: Target, props: string[]): number[] {
  return mediaRules(t.css, t.sel)
    .flatMap((r) => props.map((p) => px(r.body, p)))
    .filter((v): v is number => v !== null)
}

describe('AC6: touch targets are at least 40px at <=1023px', () => {
  for (const t of targets) {
    it(`AC6: ${t.name} has min-height >= 40px in a max-width 1023px block`, () => {
      expect(split(t.css).media).not.toBe('')
      const v = declared(t, ['min-height', 'height'])
      expect(v.length).toBeGreaterThan(0)
      expect(Math.max(...v)).toBeGreaterThanOrEqual(40)
    })
  }

  for (const t of targets.filter((x) => x.width)) {
    it(`AC6: ${t.name} has min-width >= 40px in a max-width 1023px block`, () => {
      const v = declared(t, ['min-width', 'width'])
      expect(v.length).toBeGreaterThan(0)
      expect(Math.max(...v)).toBeGreaterThanOrEqual(40)
    })
  }

  it('AC6: no narrow override of any control lowers its height below 40px', () => {
    const all = targets.flatMap((t) => declared(t, ['min-height', 'height']))
    expect(Math.min(...all)).toBeGreaterThanOrEqual(40)
  })

  it('AC6: every SegmentedControl item variant override stays at least 40px tall', () => {
    const hs = mediaRules(segmented, '.item')
      .map((r) => px(r.body, 'min-height') ?? px(r.body, 'height'))
      .filter((h): h is number => h !== null)
    expect(hs.length).toBeGreaterThan(0)
    expect(Math.min(...hs)).toBeGreaterThanOrEqual(40)
  })

  it('AC6: touch rules use the 1023px breakpoint, not a larger one', () => {
    for (const t of targets) {
      expect(t.css).not.toMatch(/@media\s*\(\s*max-width:\s*(10[3-9]\d|1[1-9]\d\d|[2-9]\d{3})px/)
    }
  })
})

describe('AC7: desktop sizing is unchanged', () => {
  it('AC7: base rules (outside media blocks) add no 40px min-height to compact controls', () => {
    const heights = targets
      .filter((x) => x.css !== addCard)
      .flatMap((t) =>
        rules(split(t.css).base)
          .filter((r) => r.selectors.includes(t.sel))
          .map((r) => px(r.body, 'min-height') ?? 0),
      )
    expect(Math.max(...heights, 0)).toBeLessThan(40)
  })

  it('AC7: AddCard base min-height stays 124px', () => {
    const base = rules(split(addCard).base).find((r) => r.selectors.includes('.card'))
    expect(px(base?.body ?? '', 'min-height')).toBe(124)
  })

  it('AC7: Tabs base padding stays 10px 2px', () => {
    const base = rules(split(tabs).base).find((r) => r.selectors.includes('.tab'))
    expect(base?.body).toMatch(/padding:\s*10px 2px/)
  })

  it('AC7: team Chip base padding stays 6px 14px', () => {
    const base = rules(split(chip).base).find((r) => r.selectors.includes('.chip'))
    expect(base?.body).toMatch(/padding:\s*6px 14px/)
  })

  it('AC7: AddPopover desktop popover width stays 360px', () => {
    const base = rules(split(addPopover).base).find((r) => r.selectors.includes('.popover'))
    expect(base?.body).toMatch(/width:\s*360px/)
  })

  it('AC7: Select base .dark padding is kept outside the media block', () => {
    const base = rules(split(select).base).find((r) => r.selectors.includes('.dark'))
    expect(base?.body).toMatch(/padding:/)
  })
})
