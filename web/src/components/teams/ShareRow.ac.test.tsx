import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seriesColor, seriesTextColor } from '../../styles/series'
import { ShareRow } from './ShareRow'
import type { ShareRowModel } from './shareModel'

function model(): ShareRowModel {
  return {
    key: 'k',
    label: 'Tally',
    barLabel: 'Tally share',
    totalText: '8 total',
    segments: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
      id: `s${i}`,
      value: 1,
      color: seriesColor(i),
      textColor: seriesTextColor(i),
      pct: 12,
      text: '12%',
      tooltip: `Name${i} · 1 (12%)`,
    })),
    leaderText: null,
  } as ShareRowModel
}

describe('AC24: share segment text colour', () => {
  it('AC24: each segment percent text uses its series text colour', () => {
    render(<ShareRow row={model()} />)
    const segs = within(screen.getByRole('group', { name: 'Tally share' })).getAllByRole('img')
    expect(segs).toHaveLength(8)
    segs.forEach((seg, i) => {
      expect(seg.getAttribute('style')).toContain(`var(--series-${i + 1})`)
      const inner = seg.querySelector('span') as HTMLElement
      const host = [seg, inner].find((n) => n.style.color !== '')
      expect(host, `segment ${i} sets a text colour`).toBeDefined()
      expect(host!.style.color).toBe(seriesTextColor(i))
    })
  })
})
