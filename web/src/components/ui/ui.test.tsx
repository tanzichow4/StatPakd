import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { vi } from 'vitest'

import { Checkbox, Chip, IconButton, Pill, SegmentedControl, Select, TabPanel, Tabs } from '.'

describe('SegmentedControl', () => {
  const options = [
    { value: 'players', label: 'Players' },
    { value: 'teams', label: 'Teams' },
  ]

  test('marks the current option and reports changes', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Kind" options={options} value="players" onChange={onChange} />)
    expect(screen.getByRole('group', { name: 'Kind' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Players' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Teams' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Teams' }))
    expect(onChange).toHaveBeenCalledWith('teams')
  })
})

describe('Tabs', () => {
  function Harness() {
    const [value, setValue] = useState<'table' | '2d' | '3d'>('table')
    return (
      <>
        <Tabs
          id="view"
          label="View"
          value={value}
          onChange={setValue}
          options={[
            { value: 'table', label: 'Table' },
            { value: '2d', label: '2D chart' },
            { value: '3d', label: '3D chart' },
          ]}
        />
        <TabPanel id="view" value={value}>
          panel {value}
        </TabPanel>
      </>
    )
  }

  test('exposes tab roles and links the panel to the selected tab', () => {
    render(<Harness />)
    expect(screen.getByRole('tab', { name: 'Table', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: 'Table' })).toHaveTextContent('panel table')
  })

  test('arrow keys move selection and focus, wrapping around', async () => {
    render(<Harness />)
    screen.getByRole('tab', { name: 'Table' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '2D chart' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: '2D chart', selected: true })).toBeInTheDocument()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: '3D chart', selected: true })).toBeInTheDocument()
  })

  test('only the selected tab is in the tab order', () => {
    render(<Harness />)
    expect(screen.getByRole('tab', { name: 'Table' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: '2D chart' })).toHaveAttribute('tabindex', '-1')
  })
})

describe('Checkbox', () => {
  test('toggles via its label and reports the new value', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Pass Yds" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Pass Yds'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  test('does not fire when disabled', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Pass Yds" checked onChange={onChange} disabled />)
    await userEvent.click(screen.getByLabelText('Pass Yds'))
    expect(onChange).not.toHaveBeenCalled()
  })

  test('AC9: locked sets aria-disabled and stays checked after click', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Pass Yds" checked onChange={onChange} locked />)
    const box = screen.getByRole('checkbox', { name: 'Pass Yds' })
    expect(box).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(box)
    expect(box).toBeChecked()
    expect(onChange).not.toHaveBeenCalled()
  })

  test('AC9: locked ignores the Space key and clicks on the label text', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Pass Yds" checked onChange={onChange} locked />)
    const box = screen.getByRole('checkbox', { name: 'Pass Yds' })
    box.focus()
    await userEvent.keyboard(' ')
    await userEvent.click(screen.getByText('Pass Yds'))
    expect(box).toBeChecked()
    expect(onChange).not.toHaveBeenCalled()
  })

  test('AC21: locked checkbox is not natively disabled and is reachable by Tab', async () => {
    render(<Checkbox label="Pass Yds" checked onChange={vi.fn()} locked />)
    const box = screen.getByRole('checkbox', { name: 'Pass Yds' })
    expect(box).toBeEnabled()
    await userEvent.tab()
    expect(box).toHaveFocus()
  })

  test('AC9: without locked there is no aria-disabled and onChange fires', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Pass Yds" checked onChange={onChange} />)
    const box = screen.getByRole('checkbox', { name: 'Pass Yds' })
    expect(box).not.toHaveAttribute('aria-disabled')
    await userEvent.click(box)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  test('AC9: locked={false} behaves like an unlocked checkbox', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Pass Yds" checked onChange={onChange} locked={false} />)
    const box = screen.getByRole('checkbox', { name: 'Pass Yds' })
    expect(box).not.toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(box)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  test('AC19: inputRef receives the input element (object ref)', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Checkbox label="Pass Yds" checked onChange={vi.fn()} inputRef={ref} />)
    expect(ref.current).toBe(screen.getByRole('checkbox', { name: 'Pass Yds' }))
  })

  test('AC19: inputRef works as a callback ref', () => {
    const seen: (HTMLInputElement | null)[] = []
    render(
      <Checkbox
        label="Pass Yds"
        checked
        onChange={vi.fn()}
        inputRef={(n) => {
          seen.push(n)
        }}
      />,
    )
    expect(seen).toContain(screen.getByRole('checkbox', { name: 'Pass Yds' }))
  })

  test('AC3: className is merged onto the label element', () => {
    render(<Checkbox label="Pass Yds" checked onChange={vi.fn()} className="rowStyle" />)
    const label = screen.getByRole('checkbox', { name: 'Pass Yds' }).closest('label')
    expect(label).toHaveClass('rowStyle')
    expect(label?.className.split(' ').length).toBeGreaterThan(1)
  })
})

describe('Pill', () => {
  test('renders its content', () => {
    render(<Pill>3,731</Pill>)
    expect(screen.getByText('3,731')).toBeInTheDocument()
  })
})

describe('Chip', () => {
  test('reflects active state and handles clicks', async () => {
    const onClick = vi.fn()
    render(
      <Chip active onClick={onClick}>
        QB
      </Chip>,
    )
    const chip = screen.getByRole('button', { name: 'QB' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(chip)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('IconButton', () => {
  test('is named by its label, not its glyph, and handles clicks', async () => {
    const onClick = vi.fn()
    render(
      <IconButton label="Remove Josh Allen" onClick={onClick}>
        ×
      </IconButton>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove Josh Allen' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Select', () => {
  test('is labelled and reports the chosen value', async () => {
    const onChange = vi.fn()
    render(
      <Select
        label="Season"
        value="2024"
        onChange={onChange}
        options={[
          { value: '2024', label: '2024 Regular Season' },
          { value: '2023', label: '2023' },
        ]}
      />,
    )
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Season' }), '2023')
    expect(onChange).toHaveBeenCalledWith('2023')
  })
})
