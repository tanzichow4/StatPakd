import { useMemo, useReducer, useState, type ReactNode } from 'react'
import type { LeagueUiDefaults, StatDef } from '../domain/types'
import { createAppReducer, createInitialState, createReducerConfig, type PerKind } from './appState'
import { AppStateContext } from './appStateContext'

export interface AppStateProviderProps {
  defaults: LeagueUiDefaults
  statDefs: PerKind<readonly StatDef[]>
  children: ReactNode
}

/**
 * Provides app UI state. `defaults` and `statDefs` are read once on mount; later changes
 * are ignored. Remount with a `key` to reset.
 */
export function AppStateProvider({ defaults, statDefs, children }: AppStateProviderProps) {
  const [reducer] = useState(() => createAppReducer(createReducerConfig(defaults, statDefs)))
  const [state, dispatch] = useReducer(reducer, defaults, createInitialState)
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch])
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
