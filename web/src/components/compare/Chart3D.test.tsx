import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LeagueUiDefaults } from '../../domain/types'
import {
  DEFAULT_CAMERA,
  axisGuides,
  axisLines,
  cubeEdges,
  depthScale,
  gridLines,
  plotPoints,
  type Camera,
} from '../../lib/projection'
import { useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import {
  compareDefaults,
  comparePlayers,
  compareStatDefs,
  compareTeams,
} from '../../test/compareFixtures'
import { Chart3D } from './Chart3D'
import css from './Chart3D.module.css?raw'

const defs = compareStatDefs()
const players = comparePlayers()
const teams = compareTeams()
const HINT = 'Drag to rotate · tap a dot · gray = league'
const KEYS_SENTENCE = 'Use arrow keys to rotate, Home to reset.'
const MESSAGE = 'Pick a stat for each axis.'
const YAW0 = 0.65
const PITCH0 = 0.38

function Probe() {
  const { state, dispatch } = useAppState()
  const { yaw, pitch, ax, sel } = state
  return (
    <div>
      <output data-testid="state">{JSON.stringify({ yaw, pitch, ax, sel })}</output>
      <button type="button" onClick={() => dispatch({ type: 'setKind', kind: 'teams' })}>
        probe to teams
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setKind', kind: 'players' })}>
        probe to players
      </button>
      <button type="button" onClick={() => dispatch({ type: 'toggleEntity', id: 'zp4' })}>
        probe toggle zp4
      </button>
    </div>
  )
}

/** Picks the pool and definitions for the current kind, as ComparePanel does. */
function Host() {
  const { state } = useAppState()
  const teamsKind = state.kind === 'teams'
  return <Chart3D pool={teamsKind ? teams : players} defs={teamsKind ? defs.teams : defs.players} />
}

function setup(defaults: LeagueUiDefaults = compareDefaults()) {
  const user = userEvent.setup()
  const view = render(
    <AppStateProvider defaults={defaults} statDefs={compareStatDefs()}>
      <Host />
      <Probe />
    </AppStateProvider>,
  )
  return { user, ...view }
}

const st = () =>
  JSON.parse(screen.getByTestId('state').textContent ?? '{}') as {
    yaw: number
    pitch: number
    ax: { players: string[]; teams: string[] }
    sel: { players: string[]; teams: string[] }
  }
const group = () => screen.getByRole('group', { name: '3D chart' })
const select = (name: string) => screen.getByRole('combobox', { name })
const resetBtn = () => screen.getByRole('button', { name: 'Reset view' })
const points = () => screen.queryAllByTestId('point')
const circles = () => points().map((g) => g.querySelector('circle') as SVGCircleElement)
const isSelected = (c: Element) =>
  (c.closest('[data-testid="point"]') as HTMLElement).style.getPropertyValue('--series') !== ''
const selectedCircles = () => circles().filter(isSelected)
const unselectedCircles = () => circles().filter((c) => !isSelected(c))
const num = (el: Element, attr: string) => Number(el.getAttribute(attr))
const cardList = () => within(screen.getByRole('complementary'))

const withAxes = (ax: [string, string, string]): LeagueUiDefaults => {
  const d = compareDefaults()
  return { ...d, players: { ...d.players, ax } }
}

/** The declaration block of a top-level selector in the CSS module source. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&')
  const m = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  return m ? m[1] : ''
}

const pointer = (init: Record<string, unknown> = {}) => ({
  pointerId: 1,
  pointerType: 'mouse',
  isPrimary: true,
  button: 0,
  ...init,
})
const down = (x = 0, y = 0, init: Record<string, unknown> = {}) =>
  fireEvent.pointerDown(group(), { ...pointer(init), clientX: x, clientY: y })
const move = (x: number, y: number, init: Record<string, unknown> = {}) =>
  fireEvent.pointerMove(group(), { ...pointer(init), clientX: x, clientY: y })
const up = (init: Record<string, unknown> = {}) => fireEvent.pointerUp(group(), pointer(init))

const proto = HTMLElement.prototype as unknown as Record<string, unknown>
beforeEach(() => {
  delete proto.setPointerCapture
})
afterEach(() => {
  delete proto.setPointerCapture
})

describe('AC12/AC13: the SVG drawing', () => {
  it('AC12: the chart is one svg with a 600 by 460 viewBox', () => {
    const { container } = setup()
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    expect(svgs[0]).toHaveAttribute('viewBox', '0 0 600 460')
  })
  it('AC13: there are 30 grid lines, 12 cube edges and 3 axis lines', () => {
    setup()
    expect(screen.getAllByTestId('grid-line')).toHaveLength(30)
    expect(screen.getAllByTestId('edge-line')).toHaveLength(12)
    expect(screen.getAllByTestId('axis-line')).toHaveLength(3)
  })
  it('AC13: the lines are drawn in the order grid, edges, axes, then points', () => {
    setup()
    const all = Array.from(
      document.querySelectorAll(
        '[data-testid="grid-line"],[data-testid="edge-line"],[data-testid="axis-line"],[data-testid="point"]',
      ),
    ).map((el) => el.getAttribute('data-testid'))
    const expected = [
      ...Array<string>(30).fill('grid-line'),
      ...Array<string>(12).fill('edge-line'),
      ...Array<string>(3).fill('axis-line'),
      ...Array<string>(points().length).fill('point'),
    ]
    expect(all).toEqual(expected)
  })
  it.each([
    ['grid-line', gridLines],
    ['edge-line', cubeEdges],
    ['axis-line', axisLines],
  ] as const)('AC13: the %s elements sit at the projected coordinates', (id, fn) => {
    setup()
    const expected = fn(DEFAULT_CAMERA)
    const els = screen.getAllByTestId(id)
    expect(els).toHaveLength(expected.length)
    els.forEach((el, i) => {
      expect(num(el, 'x1')).toBeCloseTo(expected[i].x1, 1)
      expect(num(el, 'y1')).toBeCloseTo(expected[i].y1, 1)
      expect(num(el, 'x2')).toBeCloseTo(expected[i].x2, 1)
      expect(num(el, 'y2')).toBeCloseTo(expected[i].y2, 1)
    })
  })
  it('AC13: the stroke colours and widths are the design values', () => {
    expect(rule('.grid').toLowerCase()).toContain('#e2e2de')
    expect(rule('.grid')).toMatch(/stroke-width:\s*1;/)
    expect(rule('.edge').toLowerCase()).toContain('#dadad5')
    expect(rule('.edge')).toMatch(/stroke-width:\s*1;/)
    expect(rule('.axis')).toMatch(/stroke-width:\s*2;/)
  })
})

describe('AC14: points', () => {
  it('AC14: one point per plotted entity, each with one dashed drop line and one circle', () => {
    setup()
    const expected = plotPoints(
      players,
      ['zhigh', 'zlow', 'zbig'],
      ['zp1', 'zp2', 'zp3'],
      DEFAULT_CAMERA,
    )
    expect(points()).toHaveLength(expected.length)
    expect(expected).toHaveLength(7)
    for (const g of points()) {
      expect(g.querySelectorAll('line')).toHaveLength(1)
      expect(g.querySelectorAll('circle')).toHaveLength(1)
    }
  })
  it('AC14: the circles and drop lines sit at the plotPoints coordinates', () => {
    setup()
    const expected = new Map(
      plotPoints(players, ['zhigh', 'zlow', 'zbig'], ['zp1', 'zp2', 'zp3'], DEFAULT_CAMERA).map(
        (p) => [`${p.x},${p.y}`, p] as const,
      ),
    )
    for (const g of points()) {
      const c = g.querySelector('circle') as SVGCircleElement
      const l = g.querySelector('line') as SVGLineElement
      const p = expected.get(`${num(c, 'cx')},${num(c, 'cy')}`)
      expect(p).toBeDefined()
      expect(num(l, 'x1')).toBeCloseTo(p?.x ?? NaN, 1)
      expect(num(l, 'y1')).toBeCloseTo(p?.y ?? NaN, 1)
      expect(num(l, 'x2')).toBeCloseTo(p?.footX ?? NaN, 1)
      expect(num(l, 'y2')).toBeCloseTo(p?.footY ?? NaN, 1)
    }
  })
  it('AC14: radius is 4.5 or 8 (selected), scaled up for nearer points', () => {
    setup()
    expect(selectedCircles()).toHaveLength(3)
    expect(unselectedCircles()).toHaveLength(4)
    const expected = plotPoints(
      players,
      ['zhigh', 'zlow', 'zbig'],
      ['zp1', 'zp2', 'zp3'],
      DEFAULT_CAMERA,
    )
    for (const p of expected) {
      const circle = circles().find(
        (c) => num(c, 'cx') === p.x && num(c, 'cy') === p.y,
      ) as SVGCircleElement
      const base = p.selIndex >= 0 ? 8 : 4.5
      expect(num(circle, 'r')).toBeCloseTo(base * depthScale(p.depth, DEFAULT_CAMERA), 1)
    }
  })
  it('AC14: selected points take the series colour of their selection index', () => {
    setup()
    const byColor = selectedCircles().map((c) =>
      (c.closest('[data-testid="point"]') as HTMLElement).style.getPropertyValue('--series'),
    )
    expect(byColor.slice().sort()).toEqual([
      'var(--series-1)',
      'var(--series-2)',
      'var(--series-3)',
    ])
  })
  it('AC14: unselected points carry no series colour', () => {
    setup()
    for (const c of unselectedCircles()) {
      const g = c.closest('[data-testid="point"]') as HTMLElement
      expect(g.style.getPropertyValue('--series')).toBe('')
    }
  })
  it('AC14: the drop line is dashed 3 3 and the circle has a white 1.5px stroke', () => {
    expect(rule('.drop')).toMatch(/stroke-dasharray:\s*3 3;/)
    expect(rule('.drop')).toMatch(/stroke-width:\s*1;/)
    expect(rule('.dot')).toMatch(/stroke-width:\s*1\.5;/)
    expect(rule('.dot')).toMatch(/stroke:\s*(#fff|#ffffff|var\(--color-white\))/i)
    expect(rule('.unselected .drop').toLowerCase()).toContain('#e0e0dc')
  })
  it('AC14: a pool entity with a null axis value is not plotted unless it is selected', () => {
    setup()
    // zp4 has a null zhigh: absent while unselected.
    expect(points()).toHaveLength(7)
    expect(selectedCircles()).toHaveLength(3)
  })
})

describe('AC15: draw order', () => {
  it('AC15: every selected circle is later in the DOM than every unselected circle', () => {
    setup()
    const all = circles()
    const firstSel = all.findIndex(isSelected)
    expect(firstSel).toBeGreaterThan(0)
    all.slice(firstSel).forEach((c) => expect(isSelected(c)).toBe(true))
    all.slice(0, firstSel).forEach((c) => expect(isSelected(c)).toBe(false))
  })
  it('AC15: within each group the order is back to front (descending depth)', () => {
    setup()
    const ordered = plotPoints(
      players,
      ['zhigh', 'zlow', 'zbig'],
      ['zp1', 'zp2', 'zp3'],
      DEFAULT_CAMERA,
    )
    const key = (p: { x: number; y: number }) => `${p.x},${p.y}`
    const expected = [
      ...ordered.filter((p) => p.selIndex < 0),
      ...ordered.filter((p) => p.selIndex >= 0),
    ].map(key)
    expect(circles().map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`)).toEqual(
      expected.map((k) => k),
    )
  })
  it('AC15: the order holds after rotating the camera', () => {
    setup()
    down(0, 0)
    move(-120, 45)
    const all = circles()
    const firstSel = all.findIndex(isSelected)
    expect(firstSel).toBeGreaterThan(0)
    all.slice(firstSel).forEach((c) => expect(isSelected(c)).toBe(true))
    expect(selectedCircles()).toHaveLength(3)
  })
})

describe('AC16: name tags', () => {
  it('AC16: each selected entity has a tag with its short name and none for the rest', () => {
    setup()
    const tags = screen.getAllByTestId('name-tag')
    expect(tags.map((t) => t.textContent).sort()).toEqual(['Dorvane', 'Quenby', 'Rastow'])
    expect(screen.queryByText('Whitlock')).not.toBeInTheDocument()
  })
  it('AC16: a tag sits 10 viewBox units right of its point, as percentages with 1 decimal', () => {
    setup()
    const pts = plotPoints(
      players,
      ['zhigh', 'zlow', 'zbig'],
      ['zp1', 'zp2', 'zp3'],
      DEFAULT_CAMERA,
    )
    const shortOf: Record<string, string> = { zp1: 'Quenby', zp2: 'Rastow', zp3: 'Dorvane' }
    for (const p of pts.filter((q) => q.selIndex >= 0)) {
      const tag = screen.getByText(shortOf[p.id])
      expect(tag.style.left).toBe(`${Math.round(((p.x + 10) / 600) * 1000) / 10}%`)
      expect(tag.style.top).toBe(`${Math.round((p.y / 460) * 1000) / 10}%`)
    }
  })
  it('AC16: the tag has 12px 600 text, a translucent white background and 3px padding', () => {
    const r = rule('.tag')
    expect(r).toMatch(/font-weight:\s*600/)
    expect(r).toMatch(/padding:\s*0 3px/)
    expect(r).toMatch(/translate\(0,\s*-50%\)/)
    expect(r).toMatch(/85%/)
  })
  it('AC16: an entity with a null axis value is selected, plotted and tagged', () => {
    setup(compareDefaults({ players: ['zp1', 'zp4'] }))
    expect(screen.getByText('Tolliver')).toBeInTheDocument()
    expect(points()).toHaveLength(8)
    expect(selectedCircles()).toHaveLength(2)
  })
  it('AC16: toggling an entity adds and removes its tag and its larger point', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'probe toggle zp4' }))
    expect(screen.getByText('Tolliver')).toBeInTheDocument()
    expect(selectedCircles()).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'probe toggle zp4' }))
    expect(screen.queryByText('Tolliver')).not.toBeInTheDocument()
    expect(selectedCircles()).toHaveLength(3)
  })
})

describe('AC17/AC18: axis labels and hint', () => {
  it('AC17: three labels read X · label, Y · label, Z · label in order', () => {
    setup()
    expect(screen.getAllByTestId('axis-label').map((l) => l.textContent)).toEqual([
      'X · Zhigh',
      'Y · Zlow',
      'Z · Zbig',
    ])
  })
  const titles = (camera: Camera) => {
    const g = axisGuides(camera)
    return [g.x.title, g.y.title, g.z.title]
  }
  const p1 = (v: number, total: number) => `${Math.round((v / total) * 1000) / 10}%`

  it('AC17: labels are placed from the axis titles, with top never above 10 units', () => {
    setup()
    const anchors = titles(DEFAULT_CAMERA)
    screen.getAllByTestId('axis-label').forEach((el, i) => {
      // Centred titles are kept at least 20% from either side.
      const x = i === 1 ? anchors[i].x : Math.min(480, Math.max(120, anchors[i].x))
      expect((el as HTMLElement).style.left).toBe(p1(x, 600))
      expect((el as HTMLElement).style.top).toBe(p1(Math.max(10, anchors[i].y), 460))
    })
  })
  it('AC17: the Y label follows the camera and never goes above 10 units', () => {
    setup()
    down(0, 0)
    move(0, 1000) // pitch clamps to 1.3
    const y = titles({ yaw: YAW0, pitch: 1.3 })[1]
    const top = (screen.getAllByTestId('axis-label')[1] as HTMLElement).style.top
    expect(top).toBe(p1(Math.max(10, y.y), 460))
    expect(parseFloat(top)).toBeGreaterThanOrEqual(Math.round((10 / 460) * 1000) / 10)
  })
  it('AC17/T18 AC5: X and Z titles are centred and the Y title opens away from the near edge', () => {
    setup()
    const [x, y, z] = screen.getAllByTestId('axis-label')
    expect(x.className).toMatch(/center/)
    expect(z.className).toMatch(/center/)
    const leftPct = (titles(DEFAULT_CAMERA)[1].x / 600) * 100
    expect(/before/.test(y.className)).toBe(leftPct >= 40)
    expect(rule('.axisLabel.before')).toMatch(/translate\(-100%,\s*-50%\)/)
    expect(rule('.axisLabel.center')).toMatch(/translate\(-50%,\s*-50%\)/)
  })
  it('AC18: the hint is shown with the design text', () => {
    setup()
    expect(screen.getByText(HINT)).toBeInTheDocument()
    expect(rule('.hint')).toMatch(/font-size:/)
    expect(rule('.hint')).toMatch(/left:/)
    expect(rule('.hint')).toMatch(/bottom:/)
  })
})

describe('AC19: assistive technology and pointer events', () => {
  it('AC19: the svg is hidden from assistive technology and not focusable', () => {
    const { container } = setup()
    const svg = container.querySelector('svg') as SVGElement
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
  })
  it('AC19: the axis labels and name tags are inside an aria-hidden layer', () => {
    setup()
    for (const el of [
      ...screen.getAllByTestId('axis-label'),
      ...screen.getAllByTestId('name-tag'),
    ]) {
      expect(el.closest('[aria-hidden="true"]')).not.toBeNull()
    }
  })
  it('AC19: the overlay layer does not capture pointer events', () => {
    setup()
    const layer = screen.getAllByTestId('axis-label')[0].parentElement as HTMLElement
    expect(rule('.overlay')).toMatch(/pointer-events:\s*none/)
    expect(layer.className).toMatch(/overlay/)
  })
  it('AC19: pressing on a name tag still starts a rotation', () => {
    setup()
    const tag = screen.getAllByTestId('name-tag')[0]
    fireEvent.pointerDown(tag, { ...pointer(), clientX: 0, clientY: 0 })
    move(30, 0)
    expect(st().yaw).toBeCloseTo(YAW0 + 0.3, 5)
  })
  it('AC19: no svg text node is announced as a name or heading', () => {
    setup()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('AC20: drag rotation', () => {
  it('AC20: dragging by 100 right and 50 down gives yaw +1 and pitch +0.4', () => {
    setup()
    down(100, 100)
    move(200, 150)
    expect(st().yaw).toBeCloseTo(YAW0 + 1, 5)
    expect(st().pitch).toBeCloseTo(PITCH0 + 0.4, 5)
  })
  it('AC20: dragging left and up reverses the direction', () => {
    setup()
    down(100, 100)
    move(50, 80)
    expect(st().yaw).toBeCloseTo(YAW0 - 0.5, 5)
    expect(st().pitch).toBeCloseTo(PITCH0 - 0.16, 5)
  })
  it('AC20: the plot redraws during the drag', () => {
    setup()
    const before = circles().map((c) => c.getAttribute('cx'))
    down(0, 0)
    move(80, 0)
    const during = circles().map((c) => c.getAttribute('cx'))
    expect(during).not.toEqual(before)
    const cam: Camera = { yaw: YAW0 + 0.8, pitch: PITCH0 }
    const expected = plotPoints(players, ['zhigh', 'zlow', 'zbig'], ['zp1', 'zp2', 'zp3'], cam)
    expect(points()).toHaveLength(expected.length)
    const xs = expected.map((p) => p.x).sort((a, b) => a - b)
    expect(
      circles()
        .map((c) => num(c, 'cx'))
        .sort((a, b) => a - b),
    ).toEqual(xs)
  })
  it('AC20: the drag is relative to the camera at the press', () => {
    setup()
    down(500, 500)
    move(510, 500)
    up()
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
    down(10, 10)
    move(30, 10)
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1 + 0.2, 5)
  })
  it('AC20: moving back to the press point restores the start camera', () => {
    setup()
    down(40, 40)
    move(90, 90)
    move(40, 40)
    expect(st().yaw).toBeCloseTo(YAW0, 5)
    expect(st().pitch).toBeCloseTo(PITCH0, 5)
  })
  it('AC20: pitch stays within [-0.2, 1.3] however far the pointer goes', () => {
    setup()
    down(0, 0)
    move(0, 5000)
    expect(st().pitch).toBeCloseTo(1.3, 5)
    move(0, -5000)
    expect(st().pitch).toBeCloseTo(-0.2, 5)
  })
  it('AC20: yaw is not wrapped or clamped', () => {
    setup()
    down(0, 0)
    move(2000, 0)
    expect(st().yaw).toBeCloseTo(YAW0 + 20, 5)
  })
  it('AC20: a touch pointer drags the same way', () => {
    setup()
    down(0, 0, { pointerType: 'touch', pointerId: 5 })
    move(50, 0, { pointerType: 'touch', pointerId: 5 })
    expect(st().yaw).toBeCloseTo(YAW0 + 0.5, 5)
  })
  it('AC20: a pen pointer drags the same way', () => {
    setup()
    down(0, 0, { pointerType: 'pen', pointerId: 6 })
    move(0, 50, { pointerType: 'pen', pointerId: 6 })
    expect(st().pitch).toBeCloseTo(PITCH0 + 0.4, 5)
  })
  it('AC20: a press without movement leaves the camera alone', () => {
    setup()
    down(30, 30)
    up()
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
  it('AC20: dragging changes neither the axes nor the selection', () => {
    setup()
    const before = st()
    down(0, 0)
    move(70, 20)
    expect(st().ax).toEqual(before.ax)
    expect(st().sel).toEqual(before.sel)
  })
})

describe('AC21: ending a drag', () => {
  it('AC21: moves without a press do not change the camera', () => {
    setup()
    move(300, 300)
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
  it('AC21: pointerup ends the drag', () => {
    setup()
    down(0, 0)
    move(10, 0)
    up()
    move(200, 200)
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
    expect(st().pitch).toBeCloseTo(PITCH0, 5)
  })
  it('AC21: pointercancel ends the drag', () => {
    setup()
    down(0, 0)
    move(10, 0)
    fireEvent.pointerCancel(group(), pointer())
    move(200, 200)
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
  })
  it('AC21: losing pointer capture ends the drag', () => {
    setup()
    down(0, 0)
    move(10, 0)
    fireEvent.lostPointerCapture(group(), pointer())
    move(200, 200)
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
  })
  it('AC21: a new press after each ending starts a fresh drag', () => {
    setup()
    for (const end of [
      () => up(),
      () => fireEvent.pointerCancel(group(), pointer()),
      () => fireEvent.lostPointerCapture(group(), pointer()),
    ]) {
      const before = st().yaw
      down(0, 0)
      move(10, 0)
      end()
      expect(st().yaw).toBeCloseTo(before + 0.1, 5)
    }
  })
  it('AC21: the cursor class is the dragging one only during the drag', () => {
    setup()
    const idle = group().className
    down(0, 0)
    const during = group().className
    expect(during).not.toBe(idle)
    expect(during).toMatch(/dragging/)
    up()
    expect(group().className).toBe(idle)
  })
  it('AC21: cancel and lost capture also restore the idle cursor class', () => {
    setup()
    const idle = group().className
    down(0, 0)
    fireEvent.pointerCancel(group(), pointer())
    expect(group().className).toBe(idle)
    down(0, 0)
    fireEvent.lostPointerCapture(group(), pointer())
    expect(group().className).toBe(idle)
  })
})

describe('AC22: capture and extra pointers', () => {
  it('AC22: pressing captures the pointer on the plot', () => {
    const spy = vi.fn()
    proto.setPointerCapture = spy
    setup()
    down(0, 0, { pointerId: 7 })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(7)
  })
  it('AC22: the drag works when setPointerCapture does not exist', () => {
    setup()
    expect(proto.setPointerCapture).toBeUndefined()
    down(0, 0)
    move(20, 0)
    expect(st().yaw).toBeCloseTo(YAW0 + 0.2, 5)
  })
  it('AC22: the drag works when setPointerCapture throws', () => {
    proto.setPointerCapture = () => {
      throw new Error('no such pointer')
    }
    setup()
    down(0, 0)
    move(20, 0)
    expect(st().yaw).toBeCloseTo(YAW0 + 0.2, 5)
  })
  it('AC22: a second primary pointer while dragging is ignored', () => {
    setup()
    down(0, 0, { pointerId: 1 })
    down(500, 500, { pointerId: 2 })
    move(900, 900, { pointerId: 2 })
    expect(st().yaw).toBe(YAW0)
    move(10, 0, { pointerId: 1 })
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
  })
  it('AC22: a second non-primary touch while dragging is ignored', () => {
    setup()
    down(0, 0, { pointerId: 1 })
    down(300, 300, { pointerId: 2, pointerType: 'touch', isPrimary: false })
    move(600, 0, { pointerId: 2, pointerType: 'touch', isPrimary: false })
    expect(st().yaw).toBe(YAW0)
    move(10, 0, { pointerId: 1 })
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
  })
  it('AC22: releasing the second pointer does not end the first drag', () => {
    setup()
    down(0, 0, { pointerId: 1 })
    down(50, 50, { pointerId: 2 })
    up({ pointerId: 2 })
    fireEvent.pointerCancel(group(), pointer({ pointerId: 2 }))
    fireEvent.lostPointerCapture(group(), pointer({ pointerId: 2 }))
    move(20, 0, { pointerId: 1 })
    expect(st().yaw).toBeCloseTo(YAW0 + 0.2, 5)
  })
  it('AC22: a pointer that never pressed cannot move the camera', () => {
    setup()
    down(0, 0, { pointerId: 1 })
    move(100, 100, { pointerId: 9 })
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
  it('AC22: after the first drag ends the second pointer can start one', () => {
    setup()
    down(0, 0, { pointerId: 1 })
    up({ pointerId: 1 })
    down(0, 0, { pointerId: 2 })
    move(10, 0, { pointerId: 2 })
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
  })
  it('AC22: the right mouse button does not start a drag', () => {
    setup()
    down(0, 0, { button: 2 })
    move(100, 100)
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
  it('AC22: the middle mouse button does not start a drag', () => {
    setup()
    down(0, 0, { button: 1 })
    move(100, 100)
    expect(st().yaw).toBe(YAW0)
  })
  it('AC22: a non-primary pointer does not start a drag', () => {
    setup()
    down(0, 0, { pointerType: 'touch', isPrimary: false, pointerId: 3 })
    move(100, 100, { pointerType: 'touch', isPrimary: false, pointerId: 3 })
    expect(st().yaw).toBe(YAW0)
  })
  it('AC22: an ignored right-button press does not block a later left-button drag', () => {
    setup()
    down(0, 0, { button: 2 })
    up({ button: 2 })
    down(0, 0)
    move(10, 0)
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
  })
  it('AC22: an ignored press does not change the cursor class', () => {
    setup()
    const idle = group().className
    down(0, 0, { button: 2 })
    expect(group().className).toBe(idle)
  })
})

describe('AC23: touch and cursor styles', () => {
  it('AC23: the plot disables touch scrolling and text selection', () => {
    expect(rule('.card')).toMatch(/touch-action:\s*none/)
    expect(rule('.card')).toMatch(/user-select:\s*none/)
  })
  it('AC23: the cursor is grab, and grabbing while dragging', () => {
    expect(rule('.card')).toMatch(/cursor:\s*grab;/)
    expect(rule('.dragging')).toMatch(/cursor:\s*grabbing/)
  })
})

describe('AC24: focus', () => {
  it('AC24: pressing the plot moves keyboard focus to it', () => {
    setup()
    expect(group()).not.toHaveFocus()
    down(0, 0)
    expect(group()).toHaveFocus()
  })
  it('AC24: arrow keys work right after a click on the plot', async () => {
    const { user } = setup()
    await user.click(group())
    await user.keyboard('{ArrowRight}')
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
  })
  it('AC24: a right-button press does not move focus to the plot', () => {
    setup()
    select('X axis').focus()
    down(0, 0, { button: 2 })
    expect(select('X axis')).toHaveFocus()
  })
})

describe('AC25: group role, name and description', () => {
  it('AC25: the plot is a single tab stop with tabindex 0', () => {
    setup()
    expect(group()).toHaveAttribute('tabindex', '0')
    expect(document.querySelectorAll('[tabindex]')).toHaveLength(1)
  })
  it('AC25: the group is named 3D chart', () => {
    setup()
    expect(screen.getAllByRole('group', { name: '3D chart' })).toHaveLength(1)
  })
  it('AC25: the description holds the hint and the keyboard sentence', () => {
    setup()
    expect(group()).toHaveAccessibleDescription(expect.stringContaining(HINT))
    expect(group()).toHaveAccessibleDescription(expect.stringContaining(KEYS_SENTENCE))
  })
  it('AC25: the keyboard sentence is in the document', () => {
    setup()
    expect(screen.getByText(KEYS_SENTENCE)).toBeInTheDocument()
  })
})

describe('AC26: keyboard rotation', () => {
  const key = (k: string, init: Record<string, unknown> = {}) =>
    fireEvent.keyDown(group(), { key: k, ...init })

  it('AC26: ArrowRight adds 0.1 to yaw and ArrowLeft subtracts 0.1', async () => {
    const { user } = setup()
    group().focus()
    await user.keyboard('{ArrowRight}')
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(st().yaw).toBeCloseTo(YAW0 - 0.1, 5)
    expect(st().pitch).toBeCloseTo(PITCH0, 5)
  })
  it('AC26: ArrowDown adds 0.08 to pitch and ArrowUp subtracts 0.08', async () => {
    const { user } = setup()
    group().focus()
    await user.keyboard('{ArrowDown}')
    expect(st().pitch).toBeCloseTo(PITCH0 + 0.08, 5)
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(st().pitch).toBeCloseTo(PITCH0 - 0.08, 5)
    expect(st().yaw).toBeCloseTo(YAW0, 5)
  })
  it('AC26: Shift makes every step 5 times larger', async () => {
    const { user } = setup()
    group().focus()
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(st().yaw).toBeCloseTo(YAW0 + 0.5, 5)
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(st().pitch).toBeCloseTo(PITCH0 - 0.4, 5)
  })
  it('AC26: arrow keys give the same camera as dragging 10 pixels', () => {
    setup()
    key('ArrowRight')
    key('ArrowDown')
    const viaKeys = st()
    fireEvent.click(resetBtn())
    down(0, 0)
    move(10, 10)
    expect(st().yaw).toBeCloseTo(viaKeys.yaw, 5)
    expect(st().pitch).toBeCloseTo(PITCH0 + 0.08, 5)
  })
  it('AC26: pitch stays clamped at the top and the bottom', () => {
    setup()
    for (let i = 0; i < 6; i++) key('ArrowDown', { shiftKey: true })
    expect(st().pitch).toBeCloseTo(1.3, 5)
    for (let i = 0; i < 6; i++) key('ArrowUp', { shiftKey: true })
    expect(st().pitch).toBeCloseTo(-0.2, 5)
  })
  it('AC26: Home restores the default camera', () => {
    setup()
    key('ArrowRight', { shiftKey: true })
    key('ArrowDown')
    expect(st().yaw).not.toBeCloseTo(YAW0, 3)
    key('Home')
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
  it('AC26: keys change neither the axes nor the selection', () => {
    setup()
    const before = st()
    key('ArrowLeft')
    key('Home')
    expect(st().ax).toEqual(before.ax)
    expect(st().sel).toEqual(before.sel)
  })
  it('AC26: the plot redraws after a key press', () => {
    setup()
    const before = circles().map((c) => c.getAttribute('cx'))
    key('ArrowRight', { shiftKey: true })
    expect(circles().map((c) => c.getAttribute('cx'))).not.toEqual(before)
  })
})

describe('AC27/AC42: which keys are handled', () => {
  const press = (k: string, init: Record<string, unknown> = {}) =>
    fireEvent.keyDown(group(), { key: k, ...init })

  it.each(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home'])(
    'AC27: %s is default-prevented',
    (k) => {
      setup()
      expect(press(k)).toBe(false)
    },
  )
  it.each(['ArrowRight', 'ArrowDown'])('AC27: Shift+%s is default-prevented', (k) => {
    setup()
    expect(press(k, { shiftKey: true })).toBe(false)
  })
  it('AC27: Tab and Shift+Tab are not prevented and change nothing', () => {
    setup()
    expect(press('Tab')).toBe(true)
    expect(press('Tab', { shiftKey: true })).toBe(true)
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
  it.each(['Enter', ' ', 'a', 'End', 'PageUp', 'PageDown', 'Escape', '+', '-'])(
    'AC27: the key %j is not handled',
    (k) => {
      setup()
      expect(press(k)).toBe(true)
      expect(st().yaw).toBe(YAW0)
      expect(st().pitch).toBe(PITCH0)
    },
  )
  it.each([
    ['ctrlKey', 'ArrowRight'],
    ['altKey', 'ArrowLeft'],
    ['metaKey', 'ArrowDown'],
    ['ctrlKey', 'ArrowUp'],
    ['altKey', 'Home'],
    ['metaKey', 'Home'],
    ['ctrlKey', 'Home'],
    ['altKey', 'ArrowRight'],
  ])('AC42: %s with %s is not handled and not prevented', (mod, k) => {
    setup()
    expect(press(k, { [mod]: true })).toBe(true)
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
  it('AC42: Alt+Shift+Arrow is still left to the platform', () => {
    setup()
    expect(press('ArrowRight', { altKey: true, shiftKey: true })).toBe(true)
    expect(st().yaw).toBe(YAW0)
  })
  it('AC42: Home with a modifier does not reset a rotated camera', () => {
    setup()
    press('ArrowRight')
    const rotated = st().yaw
    press('Home', { ctrlKey: true })
    expect(st().yaw).toBe(rotated)
  })
  it('AC27: keys pressed on the selects do not rotate the plot', async () => {
    const { user } = setup()
    select('X axis').focus()
    await user.keyboard('{Home}')
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
})

describe('AC28: focus indicator', () => {
  it('AC28: the focused plot has a 2px outline offset from the card, for keyboard focus only', () => {
    const r = rule('.card:focus-visible')
    expect(r).toMatch(/outline:\s*2px solid/)
    expect(r).toMatch(/outline-offset:\s*[1-9]/)
    expect(rule('.card')).not.toMatch(/outline:\s*2px/)
  })
})

describe('AC29: tab order', () => {
  it('AC29: Tab goes X, Y, Z, Reset view, the view buttons, then the plot', async () => {
    const { user } = setup()
    await user.tab()
    expect(select('X axis')).toHaveFocus()
    await user.tab()
    expect(select('Y axis')).toHaveFocus()
    await user.tab()
    expect(select('Z axis')).toHaveFocus()
    await user.tab()
    expect(resetBtn()).toHaveFocus()
    for (const name of ['3D', 'Front', 'Side', 'Top']) {
      await user.tab()
      expect(screen.getByRole('button', { name })).toHaveFocus()
    }
    await user.tab()
    expect(group()).toHaveFocus()
  })
  it('AC29: Shift+Tab from the plot goes back to the last view button', async () => {
    const { user } = setup()
    group().focus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Top' })).toHaveFocus()
  })
  it('AC29: Tab from the plot leaves the chart (the readout adds no tab stops)', async () => {
    const { user } = setup()
    group().focus()
    await user.tab()
    expect(group()).not.toHaveFocus()
    expect(screen.getByRole('complementary')).not.toContainElement(
      document.activeElement as HTMLElement,
    )
  })
})

describe('AC6/AC7/AC8: axis selects', () => {
  it('AC6: three selects show the current axes and list all stats', () => {
    setup()
    expect(select('X axis')).toHaveDisplayValue('Zhigh')
    expect(select('Y axis')).toHaveDisplayValue('Zlow')
    expect(select('Z axis')).toHaveDisplayValue('Zbig')
    expect(
      within(select('X axis'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Zhigh', 'Zlow', 'Zbig', 'Zsign', 'Zsolo'])
  })
  it('AC7: choosing a stat for X updates state, the axis label and the readout', async () => {
    const { user } = setup()
    await user.selectOptions(select('X axis'), 'zsign')
    expect(st().ax.players).toEqual(['zsign', 'zlow', 'zbig'])
    expect(select('X axis')).toHaveDisplayValue('Zsign')
    expect(screen.getAllByTestId('axis-label')[0]).toHaveTextContent('X · Zsign')
    expect(screen.queryByText('X · Zhigh')).not.toBeInTheDocument()
    const first = cardList().getAllByRole('listitem')[0]
    expect(within(first).getByText('Zsign')).toBeInTheDocument()
    expect(within(first).getByText('+2.0')).toBeInTheDocument()
    expect(within(first).queryByText('Zhigh')).not.toBeInTheDocument()
  })
  it.each([
    [1, 'Y axis', 'zsolo', 'Y · Zsolo'],
    [2, 'Z axis', 'zhigh', 'Z · Zhigh'],
  ] as const)('AC7: changing axis %i updates its label', async (index, name, key, label) => {
    const { user } = setup()
    await user.selectOptions(select(name), key)
    expect(st().ax.players[index]).toBe(key)
    expect(screen.getAllByTestId('axis-label')[index]).toHaveTextContent(label)
  })
  it('AC7: changing an axis moves the plotted points to the new projection', async () => {
    const { user } = setup()
    const before = circles().map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`)
    await user.selectOptions(select('X axis'), 'zsign')
    const expected = plotPoints(
      players,
      ['zsign', 'zlow', 'zbig'],
      ['zp1', 'zp2', 'zp3'],
      DEFAULT_CAMERA,
    )
    const after = circles().map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`)
    expect(after).not.toEqual(before)
    expect(points()).toHaveLength(expected.length)
    expect(expected).toHaveLength(8)
    expect(
      circles()
        .map((c) => num(c, 'cx'))
        .sort((a, b) => a - b),
    ).toEqual(expected.map((p) => p.x).sort((a, b) => a - b))
  })
  it('AC7: choosing a stat with nulls adds the entities that are now eligible or drops others', async () => {
    const { user } = setup()
    expect(points()).toHaveLength(7)
    await user.selectOptions(select('Z axis'), 'zsolo')
    // only zp1 has a zsolo value, plus the three selected entities
    expect(points()).toHaveLength(3)
    expect(selectedCircles()).toHaveLength(3)
    expect(unselectedCircles()).toHaveLength(0)
  })
  it('AC8: the same stat can be chosen on two axes', async () => {
    const { user } = setup()
    await user.selectOptions(select('Y axis'), 'zhigh')
    expect(st().ax.players).toEqual(['zhigh', 'zhigh', 'zbig'])
    expect(screen.getAllByTestId('axis-label').map((l) => l.textContent)).toEqual([
      'X · Zhigh',
      'Y · Zhigh',
      'Z · Zbig',
    ])
    const first = cardList().getAllByRole('listitem')[0]
    expect(within(first).getAllByText('Zhigh')).toHaveLength(2)
    expect(points().length).toBeGreaterThan(0)
  })
})

describe('AC9: axes persist per kind', () => {
  it('AC9: changing X for players, going to teams and back keeps each kind own axes', async () => {
    const { user } = setup()
    await user.selectOptions(select('X axis'), 'zsolo')
    expect(st().ax.players[0]).toBe('zsolo')
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    expect(select('X axis')).toHaveDisplayValue('Ztpts')
    expect(select('Y axis')).toHaveDisplayValue('Ztlow')
    expect(select('Z axis')).toHaveDisplayValue('Ztwin')
    expect(screen.getAllByTestId('axis-label').map((l) => l.textContent)).toEqual([
      'X · Ztpts',
      'Y · Ztlow',
      'Z · Ztwin',
    ])
    expect(
      within(select('X axis'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Ztpts', 'Ztlow', 'Ztwin'])
    await user.click(screen.getByRole('button', { name: 'probe to players' }))
    expect(select('X axis')).toHaveDisplayValue('Zsolo')
    expect(screen.getAllByTestId('axis-label')[0]).toHaveTextContent('X · Zsolo')
  })
  it('AC9: a team axis change does not touch the players axes', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    await user.selectOptions(select('Z axis'), 'ztpts')
    expect(st().ax.teams).toEqual(['ztpts', 'ztlow', 'ztpts'])
    expect(st().ax.players).toEqual(['zhigh', 'zlow', 'zbig'])
  })
  it('AC9: the camera is shared between kinds', async () => {
    const { user } = setup()
    fireEvent.keyDown(group(), { key: 'ArrowRight' })
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
  })
  it('AC9: teams plot the teams pool with team name tags', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    expect(
      screen
        .getAllByTestId('name-tag')
        .map((t) => t.textContent)
        .sort(),
    ).toEqual(['ZQA', 'ZQB', 'ZQC'])
    expect(points()).toHaveLength(3)
  })
})

describe('AC10: a missing stat definition', () => {
  const broken = () => setup(withAxes(['zhigh', 'znope', 'zbig']))

  it('AC10: the card shows the message instead of the svg', () => {
    const { container } = broken()
    expect(screen.getByText(MESSAGE)).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.queryAllByTestId('point')).toHaveLength(0)
    expect(screen.queryAllByTestId('grid-line')).toHaveLength(0)
  })
  it('AC10: no overlay labels, tags or hint are shown', () => {
    broken()
    expect(screen.queryAllByTestId('axis-label')).toHaveLength(0)
    expect(screen.queryAllByTestId('name-tag')).toHaveLength(0)
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })
  it('AC10: the select for that axis shows the disabled Choose a stat option', () => {
    broken()
    expect(select('Y axis')).toHaveDisplayValue('Choose a stat')
    expect(screen.getByRole('option', { name: 'Choose a stat' })).toBeDisabled()
    expect(select('X axis')).toHaveDisplayValue('Zhigh')
  })
  it('AC10: the readout shows an em dash for that axis and keeps the cards', () => {
    broken()
    const items = cardList().getAllByRole('listitem')
    expect(items).toHaveLength(3)
    for (const li of items) expect(within(li).getAllByText('—')).toHaveLength(1)
  })
  it('AC10: choosing a stat restores the chart', async () => {
    const { user, container } = broken()
    await user.selectOptions(select('Y axis'), 'zlow')
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.queryByText('Choose a stat')).not.toBeInTheDocument()
  })
  it('AC10: with all three axes unknown the message still shows once', () => {
    setup(withAxes(['a', 'b', 'c']))
    expect(screen.getAllByText(MESSAGE)).toHaveLength(1)
    expect(cardList().getAllByText('—')).toHaveLength(9)
  })
  it('AC10: the message is not shown when the axes are known', () => {
    setup()
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument()
  })
})

describe('AC11: Reset view', () => {
  it('AC11: clicking Reset view restores yaw 0.65 and pitch 0.38', () => {
    setup()
    down(0, 0)
    move(80, 90)
    up()
    expect(st().yaw).not.toBeCloseTo(YAW0, 2)
    fireEvent.click(resetBtn())
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
  it('AC11: the plot redraws at the default camera', () => {
    setup()
    const start = circles().map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`)
    down(0, 0)
    move(80, 90)
    up()
    fireEvent.click(resetBtn())
    expect(circles().map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`)).toEqual(start)
  })
  it('AC11: Reset view keeps axes and selection', async () => {
    const { user } = setup()
    await user.selectOptions(select('X axis'), 'zsign')
    down(0, 0)
    move(30, 30)
    up()
    const before = st()
    await user.click(resetBtn())
    expect(st().ax).toEqual(before.ax)
    expect(st().sel).toEqual(before.sel)
  })
  it('AC11: Enter and Space activate it and focus stays on the button', async () => {
    const { user } = setup()
    resetBtn().focus()
    fireEvent.keyDown(group(), { key: 'ArrowRight', shiftKey: true })
    resetBtn().focus()
    await user.keyboard('{Enter}')
    expect(st().yaw).toBe(YAW0)
    expect(resetBtn()).toHaveFocus()
    fireEvent.keyDown(group(), { key: 'ArrowRight', shiftKey: true })
    resetBtn().focus()
    await user.keyboard(' ')
    expect(st().yaw).toBe(YAW0)
    expect(resetBtn()).toHaveFocus()
  })
  it('AC11: a click on Reset view with the default camera changes nothing', async () => {
    const { user } = setup()
    await user.click(resetBtn())
    expect(st().yaw).toBe(YAW0)
    expect(st().pitch).toBe(PITCH0)
  })
})

describe('AC3/AC30-AC32: readout inside the chart', () => {
  it('AC30: the readout aside has a Readout heading and one card per selected entity', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Readout' })).toBeInTheDocument()
    const items = cardList().getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Ola Quenby')
    expect(items[1]).toHaveTextContent('Pim Rastow')
    expect(items[2]).toHaveTextContent('Quill Dorvane')
  })
  it('AC30: cards follow the selection order', () => {
    setup(compareDefaults({ players: ['zp3', 'zp1'] }))
    const items = cardList().getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Quill Dorvane')
    expect(items[1]).toHaveTextContent('Ola Quenby')
  })
  it('AC31: a card shows the formatted X, Y and Z values with the stat labels', () => {
    setup()
    const first = cardList().getAllByRole('listitem')[0]
    for (const t of ['10', '3.50', '4,000', 'Zhigh', 'Zlow', 'Zbig']) {
      expect(within(first).getByText(t)).toBeInTheDocument()
    }
  })
  it('AC32: a null value shows an em dash, and the entity is still plotted and carded', () => {
    setup(compareDefaults({ players: ['zp1', 'zp4'] }))
    const items = cardList().getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[1]).getByText('—')).toBeInTheDocument()
    expect(within(items[1]).getByText('9.00')).toBeInTheDocument()
    expect(items[0]).not.toHaveTextContent('—')
    expect(selectedCircles()).toHaveLength(2)
  })
  it('AC32: a null selected value plots at the low end of that axis, not NaN', () => {
    setup(compareDefaults({ players: ['zp4'] }))
    for (const c of circles()) {
      expect(Number.isFinite(num(c, 'cx'))).toBe(true)
      expect(Number.isFinite(num(c, 'cy'))).toBe(true)
    }
    const expected = plotPoints(players, ['zhigh', 'zlow', 'zbig'], ['zp4'], DEFAULT_CAMERA).find(
      (p) => p.id === 'zp4',
    )
    const sel = selectedCircles()[0]
    expect(num(sel, 'cx')).toBeCloseTo(expected?.x ?? NaN, 1)
    expect(num(sel, 'cy')).toBeCloseTo(expected?.y ?? NaN, 1)
  })
  it('AC32: an axis change that makes a value null updates the card to an em dash', async () => {
    const { user } = setup()
    await user.selectOptions(select('Z axis'), 'zsolo')
    const items = cardList().getAllByRole('listitem')
    expect(items[0]).not.toHaveTextContent('—')
    expect(within(items[1]).getByText('—')).toBeInTheDocument()
    expect(within(items[2]).getByText('—')).toBeInTheDocument()
  })
  it('AC3: an empty selection draws grey dots only with no tags and no cards', () => {
    setup(compareDefaults({ players: [] }))
    expect(screen.getAllByTestId('grid-line')).toHaveLength(30)
    expect(points()).toHaveLength(7)
    expect(unselectedCircles()).toHaveLength(7)
    expect(selectedCircles()).toHaveLength(0)
    expect(screen.queryAllByTestId('name-tag')).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Readout' })).toBeInTheDocument()
    expect(screen.getAllByText('Add a player to start comparing.')).toHaveLength(1)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
    expect(resetBtn()).toBeInTheDocument()
  })
  it('AC3: the empty selection can be rotated', () => {
    setup(compareDefaults({ players: [] }))
    down(0, 0)
    move(10, 0)
    expect(st().yaw).toBeCloseTo(YAW0 + 0.1, 5)
  })
  it('AC3: an empty pool still draws the cube and no points', () => {
    render(
      <AppStateProvider defaults={compareDefaults({ players: [] })} statDefs={compareStatDefs()}>
        <Chart3D pool={[]} defs={defs.players} />
      </AppStateProvider>,
    )
    expect(screen.getAllByTestId('edge-line')).toHaveLength(12)
    expect(screen.queryAllByTestId('point')).toHaveLength(0)
  })
  it('AC32: a selected id that is not in the pool gets no card, no point and no tag', () => {
    setup(compareDefaults({ players: ['zp1', 'zmissing'] }))
    expect(cardList().getAllByRole('listitem')).toHaveLength(1)
    expect(selectedCircles()).toHaveLength(1)
    expect(screen.getAllByTestId('name-tag')).toHaveLength(1)
  })
})

describe('AC34-AC36: layout styles', () => {
  it('AC34: the chart column is flex 1 1 520px with min-width 0 and the readout is 280px', () => {
    expect(rule('.chartCol')).toMatch(/flex:\s*1 1 520px/)
    expect(rule('.chartCol')).toMatch(/min-width:\s*0/)
    expect(rule('.readoutCol')).toMatch(/280px/)
    expect(rule('.root')).toMatch(/flex-wrap:\s*wrap/)
    expect(rule('.root')).toMatch(/gap:/)
  })
  it('AC36: the card clips its overlays', () => {
    expect(rule('.card')).toMatch(/overflow:\s*hidden/)
    expect(rule('.card')).toMatch(/position:\s*relative/)
    expect(rule('.overlay')).toMatch(/position:\s*absolute/)
  })
  it('AC12: the card is a bordered white card and the svg fills its width', () => {
    expect(rule('.card')).toMatch(/border:/)
    expect(rule('.card')).toMatch(/radius/)
    expect(rule('.svg')).toMatch(/width:\s*100%/)
  })
})

describe('T25: flat views, values on demand', () => {
  const button = (name: string) => screen.getByRole('button', { name })
  const tooltip = () => screen.queryByTestId('point-tooltip')
  const key = (k: string) => fireEvent.keyDown(group(), { key: k })

  it('switches to a flat view and back with the view buttons', async () => {
    const { user } = setup()
    expect(button('3D')).toHaveAttribute('aria-pressed', 'true')
    await user.click(button('Top'))
    expect(button('Top')).toHaveAttribute('aria-pressed', 'true')
    expect(st().pitch).toBeCloseTo(Math.PI / 2, 10)
    // The y axis points at the viewer, so only two titles and six numbers remain.
    expect(screen.getAllByTestId('axis-label')).toHaveLength(2)
    expect(screen.getAllByTestId('axis-tick')).toHaveLength(6)
    await user.click(button('3D'))
    expect(st().yaw).toBe(YAW0)
    expect(screen.getAllByTestId('axis-tick')).toHaveLength(9)
  })

  it('returns to the rotating view when dragged', async () => {
    const { user } = setup()
    await user.click(button('Front'))
    down(0, 0)
    move(20, 0)
    expect(button('3D')).toHaveAttribute('aria-pressed', 'true')
    expect(st().yaw).toBeCloseTo(0.2, 5)
  })

  it('stays in a flat view for a tap with a little jitter', async () => {
    const { user } = setup()
    await user.click(button('Front'))
    down(0, 0)
    move(1, 1)
    up()
    expect(button('Front')).toHaveAttribute('aria-pressed', 'true')
  })

  it('steps through dot values with N and P and clears them with Escape', () => {
    setup()
    expect(tooltip()).toBeNull()
    key('n')
    expect(tooltip()).toHaveTextContent('Ola Quenby')
    expect(tooltip()).toHaveTextContent('Zhigh10')
    expect(screen.getByTestId('active-ring')).toBeInTheDocument()
    key('n')
    expect(tooltip()).toHaveTextContent('Pim Rastow')
    key('p')
    expect(tooltip()).toHaveTextContent('Ola Quenby')
    key('Escape')
    expect(tooltip()).toBeNull()
  })

  it('shows the values of the tapped dot', () => {
    const { container } = setup()
    const svg = container.querySelector('svg') as SVGElement
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 460 }) as DOMRect
    const dot = selectedCircles()[0]
    const at = { clientX: num(dot, 'cx'), clientY: num(dot, 'cy') }
    fireEvent.pointerDown(group(), { ...pointer(), ...at })
    fireEvent.pointerUp(group(), { ...pointer(), ...at })
    expect(tooltip()).not.toBeNull()
    fireEvent.pointerDown(group(), { ...pointer(), ...at })
    fireEvent.pointerUp(group(), { ...pointer(), ...at })
    expect(tooltip()).toBeNull()
  })

  it('highlights the dot of the readout card under the pointer', () => {
    setup()
    const card = cardList().getAllByRole('listitem')[1]
    fireEvent.pointerEnter(card)
    expect(tooltip()).toHaveTextContent('Pim Rastow')
    fireEvent.pointerLeave(card)
    expect(tooltip()).toBeNull()
  })
})

describe('T22: large player pools', () => {
  const pool = (size: number) =>
    Array.from({ length: size }, (_, i) => ({
      ...players[0],
      id: `many${i}`,
      stats: { zhigh: i, zlow: i, zbig: i },
    }))
  const svgClass = (size: number) => {
    const { container, unmount } = render(
      <AppStateProvider defaults={compareDefaults({ players: [] })} statDefs={compareStatDefs()}>
        <Chart3D pool={pool(size)} defs={defs.players} />
      </AppStateProvider>,
    )
    const name = container.querySelector('svg')?.getAttribute('class') ?? ''
    unmount()
    return name
  }

  it('hides the league drop lines only when the plot is crowded', () => {
    expect(svgClass(100)).not.toMatch(/crowded/)
    expect(svgClass(101)).toMatch(/crowded/)
    expect(rule('.crowded .unselected:not(.activePoint) .drop')).toMatch(/display:\s*none/)
  })
})
