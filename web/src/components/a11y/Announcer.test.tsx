import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AnnouncerProvider } from './Announcer'
import { useAnnounce } from './useAnnounce'

function Button({ message }: { message: string }) {
  const announce = useAnnounce()
  return (
    <button type="button" onClick={() => announce(message)}>
      go
    </button>
  )
}

describe('Announcer', () => {
  it('AC15: the region exists and is empty on first render', () => {
    render(
      <AnnouncerProvider>
        <Button message="Hi" />
      </AnnouncerProvider>,
    )
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region.textContent).toBe('')
  })

  it('AC15: announce sets the text', () => {
    render(
      <AnnouncerProvider>
        <Button message="Hi" />
      </AnnouncerProvider>,
    )
    act(() => screen.getByRole('button', { name: 'go' }).click())
    expect(screen.getByRole('status').textContent).toBe('Hi')
  })

  it('AC15: a repeated message changes the node text', () => {
    render(
      <AnnouncerProvider>
        <Button message="Hi" />
      </AnnouncerProvider>,
    )
    const button = screen.getByRole('button', { name: 'go' })
    act(() => button.click())
    const first = screen.getByRole('status').textContent
    act(() => button.click())
    const second = screen.getByRole('status').textContent
    expect(second).not.toBe(first)
    expect(second?.trim()).toBe('Hi')
  })

  it('AC15: the hook is a no-op outside the provider', () => {
    render(<Button message="Hi" />)
    expect(() => act(() => screen.getByRole('button', { name: 'go' }).click())).not.toThrow()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
