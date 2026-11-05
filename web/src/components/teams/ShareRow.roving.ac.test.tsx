import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { seriesColor, seriesTextColor } from '../../styles/series'
import { ShareRow } from './ShareRow'
import type { ShareRowModel } from './shareModel'

function model(count = 4, total = 100): ShareRowModel {
  return {
    key: 'rk',
    label: 'Rover tally',
    barLabel: 'Rover tally share',
    totalText: `${total} total`,
    segments: Array.from({ length: count }, (_, i) => ({
      id: `r${i}`,
      value: total === 0 ? 0 : 10 + i,
      color: seriesColor(i),
      textColor: seriesTextColor(i),
      pct: 10,
      text: '10%',
      tooltip: `Alpha${i} · ${10 + i} (10%)`,
    })),
    leaderText: null,
  } as ShareRowModel
}

const bar = () => screen.getByRole('group', { name: 'Rover tally share' })
const segs = () => within(bar()).queryAllByRole('img')
const tooltip = () => screen.queryByRole('tooltip')

function Harness({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <button type="button">before</button>
      {children}
      <button type="button">after</button>
    </div>
  )
}

describe('AC11: share row is a single Tab stop with roving focus', () => {
  it('AC11: exactly one segment has tabindex 0 and the rest are -1', () => {
    render(<ShareRow row={model()} />)
    const stops = segs().filter((s) => s.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
    expect(stops[0]).toBe(segs()[0])
    segs()
      .slice(1)
      .forEach((s) => expect(s).toHaveAttribute('tabindex', '-1'))
  })

  it('AC11: Tab enters at the first segment and the next Tab leaves the row', async () => {
    const user = userEvent.setup()
    render(
      <Harness>
        <ShareRow row={model()} />
      </Harness>,
    )
    await user.tab()
    expect(screen.getByText('before')).toHaveFocus()
    await user.tab()
    expect(segs()[0]).toHaveFocus()
    await user.tab()
    expect(screen.getByText('after')).toHaveFocus()
  })

  it('AC11: Shift+Tab from the row goes back out to the previous control', async () => {
    const user = userEvent.setup()
    render(
      <Harness>
        <ShareRow row={model()} />
      </Harness>,
    )
    await user.tab()
    await user.tab()
    await user.keyboard('{ArrowRight}')
    await user.tab({ shift: true })
    expect(screen.getByText('before')).toHaveFocus()
  })

  it('AC11: ArrowRight and ArrowLeft move focus one segment', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(segs()[1]).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(segs()[2]).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(segs()[1]).toHaveFocus()
  })

  it('AC11: the roving stop follows focus (only the focused segment is tabindex 0)', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(segs().filter((s) => s.getAttribute('tabindex') === '0')).toEqual([segs()[2]])
  })

  it('AC11: Home goes to the first segment and End to the last', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    await user.keyboard('{End}')
    expect(segs()[3]).toHaveFocus()
    await user.keyboard('{Home}')
    expect(segs()[0]).toHaveFocus()
  })

  it('AC11: arrows stop at the ends and do not wrap', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    await user.keyboard('{ArrowLeft}')
    expect(segs()[0]).toHaveFocus()
    await user.keyboard('{End}{ArrowRight}')
    expect(segs()[3]).toHaveFocus()
  })

  it('AC11: each segment keeps its accessible name', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    segs().forEach((s, i) => expect(s).toHaveAccessibleName(`Alpha${i} · ${10 + i} (10%)`))
  })

  it('AC11: a single-segment row is still one stop and arrows keep focus on it', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model(1)} />)
    await user.tab()
    expect(segs()[0]).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowLeft}{End}{Home}')
    expect(segs()[0]).toHaveFocus()
  })

  it('AC11: a row with no segments has no Tab stop', async () => {
    const user = userEvent.setup()
    render(
      <Harness>
        <ShareRow row={{ ...model(), segments: [], totalText: '0 total' }} />
      </Harness>,
    )
    await user.tab()
    await user.tab()
    expect(screen.getByText('after')).toHaveFocus()
  })

  it('AC11: when the segments change, the stop resets to the first segment', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ShareRow row={model(4)} />)
    await user.tab()
    await user.keyboard('{End}')
    rerender(
      <ShareRow
        row={{
          ...model(3),
          segments: model(3).segments.map((s) => ({ ...s, id: `n${s.id}` })),
        }}
      />,
    )
    const stops = segs().filter((s) => s.getAttribute('tabindex') === '0')
    expect(stops).toEqual([segs()[0]])
  })
})

describe('AC12: the keyboard tooltip belongs to the focused segment', () => {
  it('AC12: no tooltip until a segment has focus', () => {
    render(<ShareRow row={model()} />)
    expect(tooltip()).not.toBeInTheDocument()
  })

  it('AC12: the tooltip text matches the focused segment after each arrow move', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    expect(tooltip()).toHaveTextContent('Alpha0 · 10 (10%)')
    await user.keyboard('{ArrowRight}')
    expect(tooltip()).toHaveTextContent('Alpha1 · 11 (10%)')
    await user.keyboard('{End}')
    expect(tooltip()).toHaveTextContent('Alpha3 · 13 (10%)')
    await user.keyboard('{Home}')
    expect(tooltip()).toHaveTextContent('Alpha0 · 10 (10%)')
  })

  it('AC12: only one tooltip exists at a time', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getAllByRole('tooltip')).toHaveLength(1)
  })

  it('AC12: the tooltip goes away when focus leaves the row', async () => {
    const user = userEvent.setup()
    render(
      <Harness>
        <ShareRow row={model()} />
      </Harness>,
    )
    await user.tab()
    await user.tab()
    expect(tooltip()).toBeInTheDocument()
    await user.tab()
    expect(tooltip()).not.toBeInTheDocument()
  })

  it('AC12: the tooltip is positioned inline with a left offset', async () => {
    const user = userEvent.setup()
    render(<ShareRow row={model()} />)
    await user.tab()
    expect((tooltip() as HTMLElement).style.left).not.toBe('')
  })
})
