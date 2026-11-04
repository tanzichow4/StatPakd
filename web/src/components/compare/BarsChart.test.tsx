import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Entity } from '../../domain/types'
import { compareStatDefs, comparePlayers, compareTeams } from '../../test/compareFixtures'
import { BarsChart } from './BarsChart'
import { resolveColumns, resolveRows } from './tableModel'

const defs = compareStatDefs()
const pool = comparePlayers()
const CAPTION = 'Bar length scaled to league range.'

function renderPlayers(ids = ['zp1', 'zp2', 'zp3'], keys = ['zhigh', 'zlow', 'zbig']) {
  return render(
    <BarsChart
      columns={resolveColumns(ids, pool)}
      rows={resolveRows(keys, defs.players)}
      pool={pool}
    />,
  )
}
const row = (name: string) => screen.getByRole('group', { name })
const line = (rowName: string, text: string) =>
  within(row(rowName))
    .getAllByRole('listitem')
    .find((li) => li.textContent?.startsWith(text)) as HTMLElement
const fill = (li: HTMLElement) => li.querySelector<HTMLElement>('[data-testid="bar-fill"]')
const styleOf = (el: Element | null) => el?.getAttribute('style') ?? ''

describe('BarsChart structure', () => {
  it('AC15: the chart is a group named Bars chart', () => {
    renderPlayers()
    expect(screen.getByRole('group', { name: 'Bars chart' })).toBeInTheDocument()
  })
  it('AC4/AC15: row groups are named by label in canonical order', () => {
    renderPlayers(['zp1', 'zp2', 'zp3'], ['zbig', 'zlow', 'zhigh'])
    const chart = screen.getByRole('group', { name: 'Bars chart' })
    const names = within(chart)
      .getAllByRole('group')
      .map((g) =>
        g
          .getAttribute('aria-labelledby')
          ?.split(' ')
          .map((id) => document.getElementById(id)?.textContent)
          .join(' '),
      )
    expect(names).toEqual(['Zhigh', 'Zlow lower is better', 'Zbig'])
  })
  it('AC5: the lower is better note appears only on lowerIsBetter rows', () => {
    renderPlayers()
    expect(screen.getAllByText('lower is better')).toHaveLength(1)
    expect(within(row('Zlow lower is better')).getByText('lower is better')).toBeInTheDocument()
    expect(within(row('Zhigh')).queryByText('lower is better')).toBeNull()
    expect(within(row('Zbig')).queryByText('lower is better')).toBeNull()
  })
  it('AC6/AC7: each line exposes shortName and formatted value as text', () => {
    renderPlayers()
    const items = within(row('Zbig')).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      'Quenby: 4,000',
      'Rastow: 1,200',
      'Dorvane: 1,000',
    ])
    expect(line('Zlow lower is better', 'Quenby')).toHaveTextContent('Quenby: 3.50')
  })
  it('AC7: signed values carry their sign', () => {
    renderPlayers(['zp1', 'zp2'], ['zsign'])
    expect(line('Zsign', 'Quenby')).toHaveTextContent('Quenby: +2.0')
    expect(line('Zsign', 'Rastow')).toHaveTextContent('Rastow: -1.0')
  })
  it('AC8: the caption appears once, after the last row', () => {
    renderPlayers()
    const captions = screen.getAllByText(CAPTION)
    expect(captions).toHaveLength(1)
    expect(
      row('Zbig').compareDocumentPosition(captions[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

describe('BarsChart widths', () => {
  it('AC9: fills use the pool range, not the selection range', () => {
    renderPlayers()
    expect(fill(line('Zhigh', 'Quenby'))?.style.width).toBe('100%')
    expect(fill(line('Zhigh', 'Rastow'))?.style.width).toBe('100%')
    expect(fill(line('Zhigh', 'Dorvane'))?.style.width).toBe('47%')
    expect(fill(line('Zbig', 'Quenby'))?.style.width).toBe('100%')
    expect(fill(line('Zbig', 'Rastow'))?.style.width).toBe('11%')
    expect(fill(line('Zbig', 'Dorvane'))?.style.width).toBe('5%')
  })
  it('AC11: lower-is-better is not inverted', () => {
    renderPlayers()
    const w = (n: string) => fill(line('Zlow lower is better', n))?.style.width
    expect(w('Rastow')).toBe('5%')
    expect(w('Dorvane')).toBe('14%')
    expect(w('Quenby')).toBe('33%')
  })
  it('AC10: an equal pool range gives the 0.5 width', () => {
    renderPlayers(['zp1'], ['zsolo'])
    const w = Number.parseInt(fill(line('Zsolo', 'Quenby'))?.style.width ?? '', 10)
    expect([52, 53]).toContain(w)
  })
  it('AC9: a single selected entity still gets a bar', () => {
    renderPlayers(['zp3'], ['zbig'])
    expect(fill(line('Zbig', 'Dorvane'))?.style.width).toBe('5%')
  })
})

describe('BarsChart not applicable values', () => {
  it('AC13/AC14: null shows a hidden dash, not applicable text, a track and no fill', () => {
    renderPlayers(['zp1', 'zp2'], ['zsolo'])
    const li = line('Zsolo', 'Rastow')
    expect(li).toHaveTextContent('Rastow: —not applicable')
    expect(within(li).getByText('—')).toHaveAttribute('aria-hidden', 'true')
    expect(within(li).getByText('not applicable')).toBeInTheDocument()
    expect(fill(li)).toBeNull()
    expect(within(li).getByTestId('bar-track')).toBeInTheDocument()
    expect(fill(line('Zsolo', 'Quenby'))).not.toBeNull()
  })
  it('AC13: a missing key is treated as not applicable', () => {
    renderPlayers(['zp3'], ['zsolo'])
    const li = line('Zsolo', 'Dorvane')
    expect(li).toHaveTextContent('Dorvane: —not applicable')
    expect(fill(li)).toBeNull()
  })
  it('AC14: an all-null pool gives no fills and no NaN', () => {
    const nullPool: Entity[] = comparePlayers().map((p) => ({
      ...p,
      stats: { ...p.stats, zsolo: null },
    }))
    const { container } = render(
      <BarsChart
        columns={resolveColumns(['zp1', 'zp2'], nullPool)}
        rows={resolveRows(['zsolo'], defs.players)}
        pool={nullPool}
      />,
    )
    expect(container.innerHTML).not.toContain('NaN')
    expect(screen.queryByTestId('bar-fill')).toBeNull()
    expect(screen.getAllByTestId('bar-track')).toHaveLength(2)
  })
  it('AC14: null pool values do not move the range', () => {
    // zp4 has a null zhigh; the zhigh range stays 1..10 so zp3 (5) is 47%.
    renderPlayers(['zp3', 'zp4'], ['zhigh'])
    expect(fill(line('Zhigh', 'Dorvane'))?.style.width).toBe('47%')
    expect(fill(line('Zhigh', 'Tolliver'))).toBeNull()
  })
})

describe('BarsChart colours and accessibility', () => {
  it('AC6: swatch and fill use the series colour of the selection index', () => {
    renderPlayers()
    ;['Quenby', 'Rastow', 'Dorvane'].forEach((n, i) => {
      const li = line('Zbig', n)
      expect(styleOf(fill(li))).toContain(`var(--series-${i + 1})`)
      expect(styleOf(li.querySelector('[aria-hidden="true"]'))).toContain(`var(--series-${i + 1})`)
    })
  })
  it('AC6: an unknown id keeps the later colours by selection index', () => {
    render(
      <BarsChart
        columns={resolveColumns(['zp1', 'zmissing', 'zp3'], pool)}
        rows={resolveRows(['zbig'], defs.players)}
        pool={pool}
      />,
    )
    expect(within(row('Zbig')).getAllByRole('listitem')).toHaveLength(2)
    expect(styleOf(fill(line('Zbig', 'Dorvane')))).toContain('var(--series-3)')
    expect(styleOf(fill(line('Zbig', 'Quenby')))).toContain('var(--series-1)')
  })
  it('AC16: swatch, track and fill are hidden from assistive technology', () => {
    renderPlayers()
    for (const t of screen.getAllByTestId('bar-track'))
      expect(t).toHaveAttribute('aria-hidden', 'true')
    for (const f of screen.getAllByTestId('bar-fill'))
      expect(f.closest('[aria-hidden="true"]')).not.toBeNull()
    for (const li of screen.getAllByRole('listitem'))
      expect(li.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
  it('AC17: the chart has no interactive elements or tab stops', () => {
    const { container } = renderPlayers()
    expect(
      container.querySelectorAll('button, a, input, select, textarea, [tabindex]'),
    ).toHaveLength(0)
  })
})

describe('BarsChart sizes and kinds', () => {
  it('AC19: eight entities give eight lines per row', () => {
    renderPlayers(['zp1', 'zp2', 'zp3', 'zp4', 'zp5', 'zp6', 'zp7', 'zp8'])
    for (const name of ['Zhigh', 'Zlow lower is better', 'Zbig'])
      expect(within(row(name)).getAllByRole('listitem')).toHaveLength(8)
  })
  it('AC21: Teams render the same structure', () => {
    const teams = compareTeams()
    render(
      <BarsChart
        columns={resolveColumns(['zt1', 'zt2', 'zt3'], teams)}
        rows={resolveRows(['ztpts', 'ztlow'], defs.teams)}
        pool={teams}
      />,
    )
    expect(screen.getByRole('group', { name: 'Bars chart' })).toBeInTheDocument()
    expect(row('Ztpts')).toBeInTheDocument()
    expect(row('Ztlow lower is better')).toBeInTheDocument()
    expect(screen.getAllByText(CAPTION)).toHaveLength(1)
    expect(fill(line('Ztpts', 'ZQC'))?.style.width).toBe('62%')
    expect(fill(line('Ztpts', 'ZQB'))?.style.width).toBe('5%')
    expect(fill(line('Ztpts', 'ZQA'))?.style.width).toBe('100%')
  })
})
