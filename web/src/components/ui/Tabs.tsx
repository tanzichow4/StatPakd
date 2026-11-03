import type { KeyboardEvent, ReactNode } from 'react'

import { cx } from '../../lib/cx'
import styles from './Tabs.module.css'
import { panelId, tabId } from './tabIds'

export interface TabOption<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  /** Unique id; panels must use tabId/panelId with the same id. */
  id: string
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

export function Tabs<T extends string>({
  id,
  options,
  value,
  onChange,
  label,
  className,
}: TabsProps<T>) {
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index
    if (e.key === 'ArrowRight') next = (index + 1) % options.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = options.length - 1
    else return
    e.preventDefault()
    onChange(options[next].value)
    document.getElementById(tabId(id, options[next].value))?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className={cx(styles.list, className)}>
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            id={tabId(id, o.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(id, o.value)}
            tabIndex={selected ? 0 : -1}
            className={cx(styles.tab, selected && styles.active)}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

interface TabPanelProps {
  id: string
  value: string
  children?: ReactNode
  hidden?: boolean
}

export function TabPanel({ id, value, children, hidden }: TabPanelProps) {
  return (
    <div role="tabpanel" id={panelId(id, value)} aria-labelledby={tabId(id, value)} hidden={hidden}>
      {children}
    </div>
  )
}
