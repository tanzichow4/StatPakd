import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartPlaceholder } from './ChartPlaceholder'
import { EmptyState } from './EmptyState'

describe('AC8: ChartPlaceholder', () => {
  it.each(['Bars chart', 'Radar chart', '3D chart'])(
    'AC8: %s names itself and says coming soon',
    (title) => {
      render(<ChartPlaceholder title={title} />)
      expect(screen.getByText(`${title} — coming soon`)).toBeInTheDocument()
    },
  )
  it('AC8: it contains no interactive elements', () => {
    const { container } = render(<ChartPlaceholder title="Bars chart" />)
    expect(
      container.querySelectorAll('button, a, input, select, textarea, [tabindex]'),
    ).toHaveLength(0)
  })
})

describe('AC22: EmptyState', () => {
  it('AC22: players ask to add a player', () => {
    render(<EmptyState kind="players" />)
    expect(screen.getByText('Add a player to start comparing.')).toBeInTheDocument()
  })
  it('AC22: teams ask to add a team', () => {
    render(<EmptyState kind="teams" />)
    expect(screen.getByText('Add a team to start comparing.')).toBeInTheDocument()
  })
  it('AC22: the empty state is not interactive', () => {
    const { container } = render(<EmptyState kind="players" />)
    expect(container.querySelectorAll('button, a, input')).toHaveLength(0)
  })
})
