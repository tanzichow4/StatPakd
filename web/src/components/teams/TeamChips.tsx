import type { Entity, EntityId } from '../../domain/types'
import { Chip } from '../ui'
import styles from './TeamChips.module.css'

interface Props {
  teams: readonly Entity[]
  activeId: EntityId
  onSelect: (id: EntityId) => void
}

/** One chip per team; only the chip matching `activeId` is pressed. */
export function TeamChips({ teams, activeId, onSelect }: Props) {
  return (
    <fieldset aria-label="Teams" className={styles.row}>
      {teams.map((team) => (
        <Chip
          key={team.id}
          mono
          active={team.id === activeId}
          onClick={() => {
            if (team.id !== activeId) onSelect(team.id)
          }}
        >
          {team.badge}
        </Chip>
      ))}
    </fieldset>
  )
}
