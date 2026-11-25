import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DotGraph } from './DotGraph'
import { categoryAt, fitLine, valueAxis, type GraphModel } from './graphModel'
import { along, niceScale } from './scale'

describe('niceScale', () => {
  it('covers the values with round ticks', () => {
    expect(niceScale([81, 360], true)).toEqual({ min: 0, max: 400, ticks: [0, 100, 200, 300, 400] })
  })
  it('keeps whole-number stats on whole ticks', () => {
    expect(niceScale([0, 2], true).ticks).toEqual([0, 1, 2])
  })
  it('allows fractions for decimal stats', () => {
    expect(niceScale([0, 1], false).ticks).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
  it('stays usable with one value or none, and never goes below zero without cause', () => {
    const one = niceScale([5, 5], true)
    expect(one.min).toBeLessThanOrEqual(5)
    expect(one.max).toBeGreaterThan(5)
    expect(niceScale([0, 0], true).min).toBe(0)
    expect(niceScale([], true).ticks.length).toBeGreaterThan(1)
    expect(niceScale([-8, 8], true).min).toBeLessThanOrEqual(-8)
  })
  it('does not add an empty step for slightly negative values', () => {
    const scale = niceScale([-12, 1500], true)
    expect(scale.min).toBe(-12)
    expect(scale.ticks).toEqual([0, 500, 1000, 1500])
    expect(along(-12, scale)).toBe(0)
  })
  it('places values in percent', () => {
    expect(along(100, niceScale([0, 400], true))).toBe(25)
  })
})

describe('graph helpers', () => {
  it('puts the low end of a vertical axis at the bottom', () => {
    const axis = valueAxis([0, 400], {}, true)
    expect(axis.ticks[0]).toEqual({ at: 100, label: '0' })
    expect(axis.ticks.at(-1)).toEqual({ at: 0, label: '400' })
  })
  it('spaces categories evenly', () => {
    expect([0, 1].map((i) => categoryAt(i, 2))).toEqual([25, 75])
  })
  it('fits a straight line', () => {
    expect(
      fitLine([
        { x: 1, y: 3 },
        { x: 2, y: 5 },
      ]),
    ).toEqual({ slope: 2, start: 1 })
    expect(
      fitLine([
        { x: 1, y: 3 },
        { x: 1, y: 5 },
      ]),
    ).toBeNull()
  })
})

describe('DotGraph', () => {
  const model: GraphModel = {
    xTitle: 'Across',
    yTitle: 'Up',
    xTicks: [{ at: 0, label: '0' }],
    yTicks: [{ at: 100, label: '0' }],
    points: [
      { id: 'a', x: 10, y: 20, color: 'red', description: 'A: 1', text: 'A' },
      { id: 'b', x: 90, y: 80, color: '', description: 'B: 2', muted: true },
    ],
    lines: [{ id: 'a', x1: 0, y1: 0, x2: 1, y2: 1, color: 'red' }],
  }

  it('titles both axes and places the dots and lines', () => {
    render(<DotGraph label="G" model={model} />)
    const graph = within(screen.getByRole('group', { name: 'G' }))
    expect(graph.getByTestId('x-title')).toHaveTextContent('Across')
    expect(graph.getByTestId('y-title')).toHaveTextContent('Up')
    expect(graph.getByTestId('dot').style.left).toBe('10%')
    expect(graph.getByTestId('dot').style.top).toBe('20%')
    expect(graph.getByTestId('league-dot')).toHaveAttribute('title', 'B: 2')
    expect(graph.getByTestId('trend-line')).toBeInTheDocument()
  })

  it('lists the dots that are not context as text', () => {
    render(<DotGraph label="G" model={model} />)
    expect(screen.getAllByRole('listitem').map((l) => l.textContent)).toEqual(['A: 1'])
  })
})
