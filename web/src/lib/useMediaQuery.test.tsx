import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery'

function Probe({ q }: { q: string }) {
  return <p>{useMediaQuery(q) ? 'yes' : 'no'}</p>
}

function stub(initial: boolean) {
  const listeners = new Set<() => void>()
  const state = { matches: initial }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return state.matches
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })),
  )
  return {
    set(v: boolean) {
      state.matches = v
      listeners.forEach((fn) => fn())
    },
    listeners,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMediaQuery', () => {
  it('returns the initial match', () => {
    stub(true)
    render(<Probe q="(max-width: 480px)" />)
    expect(screen.getByText('yes')).toBeInTheDocument()
  })

  it('returns false when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined)
    render(<Probe q="(max-width: 480px)" />)
    expect(screen.getByText('no')).toBeInTheDocument()
  })

  it('updates on change events and unsubscribes on unmount', () => {
    const mm = stub(false)
    const { unmount } = render(<Probe q="(max-width: 480px)" />)
    expect(screen.getByText('no')).toBeInTheDocument()
    act(() => mm.set(true))
    expect(screen.getByText('yes')).toBeInTheDocument()
    unmount()
    expect(mm.listeners.size).toBe(0)
  })
})
