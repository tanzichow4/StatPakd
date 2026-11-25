import { render, screen } from '@testing-library/react'

import { SegmentedControl, TabPanel, Tabs } from '.'

const options = [
  { value: 'bars', label: 'Bars' },
  { value: 'radar', label: 'Radar' },
]
const noop = () => {}

describe('AC7: SegmentedControl size option', () => {
  const fieldsetClass = (size?: 'md' | 'sm') => {
    const { unmount } = render(
      <SegmentedControl
        label="Chart type"
        options={options}
        value="bars"
        onChange={noop}
        size={size}
      />,
    )
    const cls = screen.getByRole('group', { name: 'Chart type' }).className
    unmount()
    return cls
  }

  test('AC7: the small variant applies a class the default does not', () => {
    const md = fieldsetClass()
    const sm = fieldsetClass('sm')
    expect(sm).not.toBe(md)
    expect(sm).toMatch(/sm/)
    expect(md).not.toMatch(/sm/)
  })

  test('AC7: size md is the same as leaving the size out', () => {
    expect(fieldsetClass('md')).toBe(fieldsetClass())
  })

  test('AC7: the small variant keeps pressed state and buttons', () => {
    render(
      <SegmentedControl
        label="Chart type"
        options={options}
        value="radar"
        onChange={noop}
        size="sm"
      />,
    )
    expect(screen.getByRole('button', { name: 'Radar' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Bars' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('AC6: TabPanel hidden option and Tabs className', () => {
  test('AC6: TabPanel is not hidden by default', () => {
    render(
      <TabPanel id="v" value="a">
        content
      </TabPanel>,
    )
    expect(screen.getByRole('tabpanel')).not.toHaveAttribute('hidden')
  })

  test('AC6: TabPanel hidden sets the hidden attribute and removes it from the accessibility tree', () => {
    render(
      <TabPanel id="v" value="a" hidden>
        content
      </TabPanel>,
    )
    expect(screen.getByRole('tabpanel', { hidden: true })).toHaveAttribute('hidden')
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
  })

  test('AC6: hidden false leaves the panel visible', () => {
    render(
      <TabPanel id="v" value="a" hidden={false}>
        content
      </TabPanel>,
    )
    expect(screen.getByRole('tabpanel')).not.toHaveAttribute('hidden')
  })

  test('AC4: Tabs merges className onto the tablist and keeps its own class', () => {
    const tabOptions = [{ value: 'a', label: 'A' }]
    const { unmount } = render(
      <Tabs id="v" label="Plain" options={tabOptions} value="a" onChange={noop} />,
    )
    const plain = screen.getByRole('tablist', { name: 'Plain' }).className
    unmount()
    render(
      <Tabs
        id="v"
        label="Extra"
        options={tabOptions}
        value="a"
        onChange={noop}
        className="zextra"
      />,
    )
    const list = screen.getByRole('tablist', { name: 'Extra' })
    expect(list).toHaveClass('zextra')
    expect(list.className).toContain(plain)
  })
})
