import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Entity, EntityId } from '../../domain/types'
import { MAX_SELECTED, useAppState } from '../../state'
import { AddCard } from './AddCard'
import { AddPopover } from './AddPopover'
import { EntityCard } from './EntityCard'
import { filterEntities, kindSingular, popoverShift, positionChips } from './filterEntities'
import { useEntities } from './useEntities'
import styles from './EntityPicker.module.css'

const POPOVER_WIDTH = 360
const POPOVER_MAX_VIEWPORT_FRACTION = 0.9

type PendingFocus = { to: 'lastCard' } | { to: 'removeAt'; position: number } | null

interface VisibleCard {
  index: number
  entity: Entity
}

export function EntityPicker() {
  const { state, dispatch } = useAppState()
  const { kind, season, q, pos, addOpen, teamMode } = state
  const entities = useEntities(kind, season)
  const popoverId = useId()
  const selectedIds = state.sel[kind]
  const full = selectedIds.length >= MAX_SELECTED

  const addCardRef = useRef<HTMLButtonElement | null>(null)
  const removeRefs = useRef(new Map<EntityId, HTMLButtonElement>())
  const pendingFocus = useRef<PendingFocus>(null)
  const [shiftLeft, setShiftLeft] = useState(0)

  const visibleCards = useMemo<VisibleCard[]>(() => {
    const byId = new Map(entities.map((e) => [e.id, e]))
    const cards: VisibleCard[] = []
    selectedIds.forEach((id, index) => {
      const entity = byId.get(id)
      if (entity) cards.push({ index, entity })
    })
    return cards
  }, [entities, selectedIds])

  const results = useMemo(() => filterEntities(entities, q, pos), [entities, q, pos])
  const chips = useMemo(
    () => (kind === 'players' ? positionChips(entities) : null),
    [entities, kind],
  )

  // Consume a requested focus move once the cards reflect the change.
  useEffect(() => {
    const pending = pendingFocus.current
    if (!pending) return
    pendingFocus.current = null
    const removeButtonAt = (position: number) => {
      const card = visibleCards[position]
      return card ? removeRefs.current.get(card.entity.id) : undefined
    }
    if (pending.to === 'lastCard') {
      removeButtonAt(visibleCards.length - 1)?.focus()
      return
    }
    const target =
      removeButtonAt(pending.position) ?? removeButtonAt(pending.position - 1) ?? addCardRef.current
    target?.focus()
  }, [visibleCards, state.sel, state.kind, state.addOpen])

  // Keep the open popover inside the viewport.
  useLayoutEffect(() => {
    if (!addOpen) return
    const update = () => {
      const anchor = addCardRef.current
      if (!anchor) return
      const viewport = window.innerWidth
      const width = Math.min(POPOVER_WIDTH, viewport * POPOVER_MAX_VIEWPORT_FRACTION)
      setShiftLeft(popoverShift(anchor.getBoundingClientRect().left, width, viewport))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [addOpen, selectedIds.length])

  if (kind === 'teams' && teamMode === 'inside') return null

  const singular = kindSingular(kind)

  const closeAndFocusAddCard = (type: 'toggleAdd' | 'closeAdd') => {
    dispatch({ type })
    addCardRef.current?.focus()
  }

  const toggleFromPopover = (id: EntityId) => {
    if (!selectedIds.includes(id) && selectedIds.length === MAX_SELECTED - 1) {
      pendingFocus.current = { to: 'lastCard' }
    }
    dispatch({ type: 'toggleEntity', id })
  }

  const removeCard = (id: EntityId, position: number) => {
    pendingFocus.current = { to: 'removeAt', position }
    dispatch({ type: 'toggleEntity', id })
  }

  return (
    <ul className={styles.row} aria-label={`Selected ${singular}s`}>
      {visibleCards.map(({ index, entity }, position) => (
        <EntityCard
          key={entity.id}
          entity={entity}
          colorIndex={index}
          onRemove={() => removeCard(entity.id, position)}
          removeRef={(node) => {
            if (node) removeRefs.current.set(entity.id, node)
            else removeRefs.current.delete(entity.id)
          }}
        />
      ))}
      {!full && (
        <li className={styles.addCell}>
          <AddCard
            kind={kind}
            selectedCount={selectedIds.length}
            expanded={addOpen}
            popoverId={popoverId}
            onToggle={() => dispatch({ type: 'toggleAdd' })}
            onEscape={() => dispatch({ type: 'closeAdd' })}
            buttonRef={addCardRef}
          />
          {addOpen && (
            <AddPopover
              id={popoverId}
              kind={kind}
              results={results}
              chips={chips}
              q={q}
              pos={pos}
              selectedIds={selectedIds}
              full={full}
              onQuery={(value) => dispatch({ type: 'setQuery', q: value })}
              onPos={(value) => dispatch({ type: 'setPos', pos: value })}
              onToggleEntity={toggleFromPopover}
              onDone={() => closeAndFocusAddCard('toggleAdd')}
              onEscape={() => closeAndFocusAddCard('closeAdd')}
              shiftLeft={shiftLeft}
            />
          )}
        </li>
      )}
    </ul>
  )
}
