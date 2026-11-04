import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TeamHeader } from './TeamHeader'
import type { SummaryStat } from './teamHeaderModel'

const summary: SummaryStat[] = [
  { key: 'a', label: 'Zavg / G', text: '27.2' },
  { key: 'b', label: 'Zdiff', text: '+11' },
  { key: 'c', label: 'Zmissing', text: '—' },
]

function setup(stats: SummaryStat[] = [], meta = 'ZDiv · 9-8 · 3031') {
  return render(<TeamHeader badge="ZQA" name="Zephyr Flarns" meta={meta} summary={stats} />)
}

describe('AC15: the header card content', () => {
  it('AC15: shows the badge, the name as a level 2 heading and the meta line', () => {
    setup()
    expect(screen.getByRole('heading', { level: 2, name: 'Zephyr Flarns' })).toBeInTheDocument()
    expect(screen.getByText('ZQA')).toBeInTheDocument()
    expect(screen.getByText('ZDiv · 9-8 · 3031')).toBeInTheDocument()
  })
  it('AC15: the card is a section labelled by the team name', () => {
    setup()
    expect(screen.getByRole('region', { name: 'Zephyr Flarns' })).toBeInTheDocument()
  })
})

describe('AC16/AC17: the summary stats', () => {
  it('AC16: shows each label with its value, in the order given', () => {
    setup(summary)
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual([
      'Zavg / G',
      'Zdiff',
      'Zmissing',
    ])
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual([
      '27.2',
      '+11',
      '—',
    ])
  })
  it('AC16: each label is paired with its own value', () => {
    setup(summary)
    const diff = screen.getByText('Zdiff').parentElement as HTMLElement
    expect(within(diff).getByText('+11')).toBeInTheDocument()
    expect(within(diff).queryByText('27.2')).not.toBeInTheDocument()
  })
  it('AC17: a missing-value placeholder is shown as given', () => {
    setup([{ key: 'c', label: 'Zmissing', text: '—' }])
    expect(screen.getByText('—')).toBeInTheDocument()
  })
  it('AC16: with no summary no stats list is rendered', () => {
    const { container } = setup([])
    expect(container.querySelector('dl')).toBeNull()
    expect(screen.queryAllByRole('term')).toHaveLength(0)
  })
})
