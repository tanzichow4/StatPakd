import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seriesColor } from '../../styles/series'
import { ShareLegend } from './ShareLegend'
import type { LegendItem } from './shareModel'

function items(n: number): LegendItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `zr${i}`,
    name: i === 2 ? 'Cher' : `Name${i} Surname${i}`,
    color: seriesColor(i),
  }))
}

const list = () => screen.getByRole('list', { name: 'Legend' })
const entries = () => within(list()).getAllByRole('listitem')
const swatchOf = (li: HTMLElement) => {
  const el = li.querySelector('span')
  if (!el) throw new Error('no swatch')
  return el
}

describe('AC24: the legend', () => {
  it('AC24: lists every player in the given order with the full name', () => {
    render(<ShareLegend items={items(4)} />)
    expect(entries().map((li) => li.textContent)).toEqual([
      'Name0 Surname0',
      'Name1 Surname1',
      'Cher',
      'Name3 Surname3',
    ])
  })
  it('AC24: an empty legend renders an empty named list', () => {
    render(<ShareLegend items={[]} />)
    expect(list()).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})

describe('AC25: swatch colours', () => {
  it('AC25: each swatch uses the colour of its item', () => {
    render(<ShareLegend items={items(3)} />)
    const colours = entries().map((li) => swatchOf(li).getAttribute('style') ?? '')
    expect(colours[0]).toContain('var(--series-1)')
    expect(colours[1]).toContain('var(--series-2)')
    expect(colours[2]).toContain('var(--series-3)')
  })
  it('AC25: more than 8 players wrap back to the first colour', () => {
    render(<ShareLegend items={items(10)} />)
    const styleOf = (i: number) => swatchOf(entries()[i] as HTMLElement).getAttribute('style')
    expect(styleOf(8)).toBe(styleOf(0))
    expect(styleOf(9)).toBe(styleOf(1))
    expect(styleOf(7)).not.toBe(styleOf(0))
  })
  it('AC25: the swatch carries no text of its own', () => {
    render(<ShareLegend items={items(2)} />)
    expect(swatchOf(entries()[0] as HTMLElement).textContent).toBe('')
  })
})
