import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { nflStatDefsByKind, nflUiDefaults } from '../data/nfl'
import { AppStateProvider } from './AppStateProvider'
import { useAppState } from './useAppState'

function Consumer() {
  const { state, dispatch } = useAppState()
  return (
    <div>
      <p data-testid="view">{state.view}</p>
      <p data-testid="count">{state.sel.players.length}</p>
      <button onClick={() => dispatch({ type: 'setView', view: 'num' })}>num</button>
      <button onClick={() => dispatch({ type: 'toggleEntity', id: 'mahomes' })}>add</button>
      <button onClick={() => dispatch({ type: 'toggleStat', key: 'nope' })}>bad</button>
    </div>
  )
}

const wrap = (ui: ReactNode) =>
  render(
    <AppStateProvider defaults={nflUiDefaults()} statDefs={nflStatDefsByKind()}>
      {ui}
    </AppStateProvider>,
  )

describe('AC27: provider and hook', () => {
  it('AC27: shows values from the initial state', () => {
    wrap(<Consumer />)
    expect(screen.getByTestId('view')).toHaveTextContent('3d')
    expect(screen.getByTestId('count')).toHaveTextContent('3')
  })
  it('AC27: a dispatched action updates the rendered output', async () => {
    const user = userEvent.setup()
    wrap(<Consumer />)
    await user.click(screen.getByRole('button', { name: 'num' }))
    expect(screen.getByTestId('view')).toHaveTextContent('num')
    await user.click(screen.getByRole('button', { name: 'add' }))
    expect(screen.getByTestId('count')).toHaveTextContent('4')
  })
  it('AC27: two consumers share the same state', async () => {
    const user = userEvent.setup()
    wrap(
      <>
        <Consumer />
        <Consumer />
      </>,
    )
    await user.click(screen.getAllByRole('button', { name: 'num' })[0])
    expect(screen.getAllByTestId('view').map((e) => e.textContent)).toEqual(['num', 'num'])
  })
  it('AC27: separate providers do not share state', async () => {
    const user = userEvent.setup()
    wrap(<Consumer />)
    wrap(<Consumer />)
    await user.click(screen.getAllByRole('button', { name: 'num' })[0])
    expect(screen.getAllByTestId('view').map((e) => e.textContent)).toEqual(['num', '3d'])
  })
  it('AC27: an invalid action leaves the rendered output as it was', async () => {
    const user = userEvent.setup()
    wrap(<Consumer />)
    await user.click(screen.getByRole('button', { name: 'bad' }))
    expect(screen.getByTestId('view')).toHaveTextContent('3d')
    expect(screen.getByTestId('count')).toHaveTextContent('3')
  })
})

describe('AC28: hook outside the provider', () => {
  it('AC28: throws a clear error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<Consumer />)).toThrow(
        /useAppState must be used inside <AppStateProvider>/,
      )
    } finally {
      spy.mockRestore()
    }
  })
})
