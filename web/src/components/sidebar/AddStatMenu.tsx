import { useEffect, useRef } from 'react'
import type { StatDef } from '../../domain/types'
import styles from './AddStatMenu.module.css'

interface Props {
  id: string
  groupName: string
  items: readonly StatDef[]
  onPick: (key: string) => void
}

export function AddStatMenu({ id, groupName, items, onPick }: Props) {
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  return (
    <fieldset id={id} aria-label={`Stats to add to ${groupName}`} className={styles.menu}>
      {items.map((item, i) => (
        <button
          key={item.key}
          ref={i === 0 ? firstRef : undefined}
          type="button"
          className={styles.item}
          onClick={() => onPick(item.key)}
        >
          {item.label}
        </button>
      ))}
    </fieldset>
  )
}
