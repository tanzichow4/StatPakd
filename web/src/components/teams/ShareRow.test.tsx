import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { seriesColor } from '../../styles/series'
import { ShareRow } from './ShareRow'
import type { ShareRowModel } from './shareModel'

const DOT = '·'

function seg(i: number, value: number, pct: number, name = `Name${i} Surname${i}`) {
  return {
    id: `zr${i}`,
    value,
    color: seriesColor(i),
    pct,
    text: pct >= 9 ? `${pct}%` : null,
    tooltip: `${name} ${DOT} ${value} (${pct}%)`,
  }
}

function model(overrides: Partial<ShareRowModel> = {}): ShareRowModel {
  return {
    key: 'zk',
    label: 'Zk tally',
    barLabel: 'Zk tally share',
    totalText: '100 total',
    segments: [seg(0, 60, 60), seg(1, 5, 5), seg(2, 35, 35)],
    leaderText: 'Leader: Surname0 60%',
    ...overrides,
  }
}

const bar = () => screen.getByRole('group', { name: 'Zk tally share' })
const segments = () => within(bar()).queryAllByRole('img')

describe('AC14: left cell', () => {
  it('AC14: shows the share label and the total text', () => {
    render(<ShareRow row={model({ totalText: '1,234 total' })} />)
    expect(screen.getByText('Zk tally')).toBeInTheDocument()
    expect(screen.getByText('1,234 total')).toBeInTheDocument()
  })
  it('AC14: the label comes before the total in the document', () => {
    render(<ShareRow row={model()} />)
    const label = screen.getByText('Zk tally')
    const total = screen.getByText('100 total')
    expect(label.compareDocumentPosition(total) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('AC15/AC25: segments', () => {
  it('AC15: renders one segment per model segment, in order', () => {
    render(<ShareRow row={model()} />)
    expect(segments().map((s) => s.getAttribute('aria-label'))).toEqual([
      `Name0 Surname0 ${DOT} 60 (60%)`,
      `Name1 Surname1 ${DOT} 5 (5%)`,
      `Name2 Surname2 ${DOT} 35 (35%)`,
    ])
  })
  it('AC15: each segment grows in proportion to its value', () => {
    render(<ShareRow row={model()} />)
    expect(segments().map((s) => s.style.flexGrow)).toEqual(['60', '5', '35'])
  })
  it('AC25: each segment is coloured with its own colour', () => {
    render(<ShareRow row={model()} />)
    const styles = segments().map((s) => s.getAttribute('style') ?? '')
    expect(styles[0]).toContain('var(--series-1)')
    expect(styles[1]).toContain('var(--series-2)')
    expect(styles[2]).toContain('var(--series-3)')
  })
  it('AC25: a segment from the 9th player wraps to the first colour', () => {
    const row = model({ segments: [seg(0, 1, 50), seg(8, 1, 50)] })
    render(<ShareRow row={row} />)
    const [a, b] = segments()
    expect(b?.getAttribute('style')).toBe(a?.getAttribute('style'))
  })
})

describe('AC16: percent text', () => {
  it('AC16: shows the text of segments with 9% or more and none below', () => {
    const row = model({ segments: [seg(0, 83, 83), seg(1, 9, 9), seg(2, 8, 8)] })
    render(<ShareRow row={row} />)
    const [a, b, c] = segments()
    expect(a).toHaveTextContent('83%')
    expect(b).toHaveTextContent('9%')
    expect(c?.textContent).toBe('')
  })
  it('AC22: the percent text is not what the segment is named', () => {
    render(<ShareRow row={model()} />)
    expect(screen.queryByRole('img', { name: '60%' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: `Name0 Surname0 ${DOT} 60 (60%)` })).toBeInTheDocument()
  })
})

describe('AC21/AC23: names and hover text', () => {
  it('AC21: every segment has the tooltip text as its title', () => {
    render(<ShareRow row={model()} />)
    expect(segments().map((s) => s.getAttribute('title'))).toEqual(
      model().segments.map((s) => s.tooltip),
    )
  })
  it('AC23: the bar is a group named after its stat', () => {
    render(<ShareRow row={model()} />)
    expect(bar()).toBeInTheDocument()
  })
})

describe('AC22: keyboard focus', () => {
  it('AC22: Tab walks the segments in order and nothing else', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    expect(segments()[0]).toHaveFocus()
    await user.tab()
    expect(segments()[1]).toHaveFocus()
    await user.tab()
    expect(segments()[2]).toHaveFocus()
    await user.tab()
    expect(document.body).toHaveFocus()
  })
  it('AC22: no tooltip is visible before focus', () => {
    render(<ShareRow row={model()} />)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
  it('AC22: focusing a segment shows its tooltip text on screen', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    await user.tab()
    expect(screen.getByRole('tooltip')).toHaveTextContent(`Name1 Surname1 ${DOT} 5 (5%)`)
    expect(screen.getByRole('tooltip')).toBeVisible()
  })
  it('AC22: the tooltip follows focus to the next segment and goes on blur', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Name0 Surname0')
    await user.tab()
    expect(screen.getAllByRole('tooltip')).toHaveLength(1)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Name1 Surname1')
    await user.tab()
    await user.tab()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
  it('AC22: the visible tooltip is outside the clipped bar', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    expect(bar()).not.toContainElement(screen.getByRole('tooltip'))
  })
  it('AC22: shift-tab goes back through the segments', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    await user.tab()
    await user.tab({ shift: true })
    expect(segments()[0]).toHaveFocus()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Name0 Surname0')
  })
})

describe('AC17: right cell', () => {
  it('AC17: shows the leader text', () => {
    render(<ShareRow row={model()} />)
    expect(screen.getByText('Leader: Surname0 60%')).toBeInTheDocument()
  })
})

describe('AC19: zero total', () => {
  const empty = () => model({ totalText: '0 total', segments: [], leaderText: null })
  it('AC19: has no segments, no tooltip, no tab stop and no Leader text', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={empty()} />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(screen.queryByText(/Leader/)).not.toBeInTheDocument()
    await user.tab()
    expect(document.body).toHaveFocus()
  })
  it('AC19: still shows the label, 0 total and the named empty bar', () => {
    render(<ShareRow row={empty()} />)
    expect(screen.getByText('Zk tally')).toBeInTheDocument()
    expect(screen.getByText('0 total')).toBeInTheDocument()
    expect(bar()).toBeInTheDocument()
  })
  it('AC19: nothing says NaN, Infinity or undefined', () => {
    const { container } = render(<ShareRow row={empty()} />)
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/)
  })
})

describe('AC15: a single segment', () => {
  it('AC15: a model with a single segment fills the bar with that one segment', () => {
    render(
      <ShareRow row={model({ segments: [seg(3, 7, 100)], leaderText: 'Leader: Surname3 100%' })} />,
    )
    expect(segments()).toHaveLength(1)
    expect(segments()[0]).toHaveTextContent('100%')
  })
})
