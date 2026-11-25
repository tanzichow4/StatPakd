import { useState } from 'react'
import type { Entity, EntityId } from '../../domain/types'
import { ALL_POSITIONS } from '../../state'
import { filterEntities } from '../picker/filterEntities'
import { Chip } from '../ui'
import styles from './PlayerDetail.module.css'

/** Most players listed at once; searching narrows the rest. */
export const PICKER_LIMIT = 24

interface Props {
  players: Entity[]
  activeId: EntityId
  onSelect: (id: EntityId) => void
}

/** Search box and one button per matching player. */
export function PlayerPicker({ players, activeId, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const matches = filterEntities(players, query, ALL_POSITIONS)

  return (
    <div className={styles.picker}>
      <input
        type="search"
        aria-label="Find a player"
        placeholder="Find a player by name or team"
        className={styles.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {matches.length === 0 ? (
        <p className={styles.hint}>No matches.</p>
      ) : (
        <fieldset className={styles.chips} aria-label="Player">
          {matches.slice(0, PICKER_LIMIT).map((p) => (
            <Chip key={p.id} active={p.id === activeId} onClick={() => onSelect(p.id)}>
              {p.name}
            </Chip>
          ))}
        </fieldset>
      )}
      {matches.length > PICKER_LIMIT && (
        <p className={styles.hint}>
          Showing {PICKER_LIMIT} of {matches.length}. Search to find others.
        </p>
      )}
    </div>
  )
}
