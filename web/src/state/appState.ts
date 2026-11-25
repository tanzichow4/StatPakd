import type {
  EntityId,
  EntityKind,
  LeagueUiDefaults,
  RosterUnit,
  Season,
  StatDef,
  TeamId,
} from '../domain/types'

export type ViewMode = 'num' | '2d' | '3d'
export type Chart2Mode = 'bars' | 'dots' | 'radar'
export type CameraPreset = '3d' | 'front' | 'side' | 'top'
export type TeamMode = 'compare' | 'inside'
export type PlayerMode = 'compare' | 'detail'
export type AxisIndex = 0 | 1 | 2
export type Axes = [string, string, string]
export type PerKind<T> = Record<EntityKind, T>
export type SortDir = -1 | 1
export interface RosterSort {
  k: string
  d: SortDir
}

export interface AppState {
  kind: EntityKind
  season: Season
  sel: PerKind<EntityId[]>
  stats: PerKind<string[]>
  ax: PerKind<Axes>
  view: ViewMode
  chart2: Chart2Mode
  q: string
  pos: string
  addOpen: boolean
  addStatOpen: string | null
  playerMode: PlayerMode
  /** Player shown in player detail; empty until one is chosen. */
  playerId: EntityId
  /** Stat of the period-by-period chart; empty until one is chosen. */
  periodStat: string
  /** Periods chosen for comparison, in season order. */
  periods: number[]
  teamMode: TeamMode
  teamId: TeamId
  unit: RosterUnit
  tSort: RosterSort
  yaw: number
  pitch: number
  /** True while a straight-on view is shown (no perspective). */
  flat: boolean
}

export const MAX_SELECTED = 8
export const DEFAULT_YAW = 0.65
export const DEFAULT_PITCH = 0.38
export const PITCH_MIN = -0.2
export const PITCH_MAX = 1.3
export const ALL_POSITIONS = 'All'
/** Straight-on views. These may exceed the drag limits on pitch. */
export const FLAT_VIEWS: Record<Exclude<CameraPreset, '3d'>, { yaw: number; pitch: number }> = {
  front: { yaw: 0, pitch: 0 },
  side: { yaw: Math.PI / 2, pitch: 0 },
  top: { yaw: 0, pitch: Math.PI / 2 },
}

export type AppAction =
  | { type: 'toggleEntity'; id: EntityId }
  | { type: 'toggleStat'; key: string }
  | { type: 'addStat'; key: string }
  | { type: 'toggleAddStatMenu'; group: string }
  | { type: 'closeAddStatMenu' }
  | { type: 'setKind'; kind: EntityKind }
  | { type: 'setSeason'; season: Season }
  | { type: 'setQuery'; q: string }
  | { type: 'setPos'; pos: string }
  | { type: 'toggleAdd' }
  | { type: 'closeAdd' }
  | { type: 'setView'; view: ViewMode }
  | { type: 'setChart2'; chart2: Chart2Mode }
  | { type: 'setAxis'; index: AxisIndex; key: string }
  | { type: 'setCamera'; yaw: number; pitch: number }
  | { type: 'resetView' }
  | { type: 'setCameraPreset'; preset: CameraPreset }
  | { type: 'setPlayerMode'; mode: PlayerMode }
  | { type: 'setPlayer'; playerId: EntityId }
  | { type: 'setPeriodStat'; key: string }
  | { type: 'togglePeriod'; period: number }
  | { type: 'setPeriods'; periods: number[] }
  | { type: 'setTeamMode'; mode: TeamMode }
  | { type: 'setTeam'; teamId: TeamId }
  | { type: 'setUnit'; unit: RosterUnit }
  | { type: 'sortRoster'; key: string }

export interface ReducerConfig {
  statOrder: PerKind<readonly string[]>
  defaultSortKey: string
}

/** Canonical stat order: groups by first appearance, then list order within each group. */
export function canonicalStatOrder(defs: readonly StatDef[]): string[] {
  const groups: string[] = []
  const byGroup = new Map<string, string[]>()
  for (const def of defs) {
    let keys = byGroup.get(def.group)
    if (!keys) {
      keys = []
      byGroup.set(def.group, keys)
      groups.push(def.group)
    }
    keys.push(def.key)
  }
  return groups.flatMap((g) => byGroup.get(g) ?? [])
}

export function createReducerConfig(
  defaults: LeagueUiDefaults,
  statDefs: PerKind<readonly StatDef[]>,
): ReducerConfig {
  return {
    statOrder: {
      players: canonicalStatOrder(statDefs.players),
      teams: canonicalStatOrder(statDefs.teams),
    },
    defaultSortKey: defaults.sortKey,
  }
}

export function createInitialState(defaults: LeagueUiDefaults): AppState {
  return {
    kind: 'players',
    season: defaults.season,
    sel: { players: [...defaults.players.sel], teams: [...defaults.teams.sel] },
    stats: { players: [...defaults.players.stats], teams: [...defaults.teams.stats] },
    ax: {
      players: [...defaults.players.ax],
      teams: [...defaults.teams.ax],
    },
    view: '3d',
    chart2: 'bars',
    q: '',
    pos: ALL_POSITIONS,
    addOpen: false,
    addStatOpen: null,
    playerMode: 'compare',
    playerId: '',
    periodStat: '',
    periods: [],
    teamMode: 'compare',
    teamId: defaults.teamId,
    unit: defaults.unit,
    tSort: { k: defaults.sortKey, d: -1 },
    yaw: DEFAULT_YAW,
    pitch: DEFAULT_PITCH,
    flat: false,
  }
}

const isPeriod = (period: number) => Number.isInteger(period) && period > 0

/** Unique periods in season order. */
const sortedPeriods = (periods: number[]) => [...new Set(periods)].sort((a, b) => a - b)

function withDefaultCamera(state: AppState): AppState {
  if (state.yaw === DEFAULT_YAW && state.pitch === DEFAULT_PITCH && !state.flat) return state
  return { ...state, yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH, flat: false }
}

export function createAppReducer(
  config: ReducerConfig,
): (state: AppState, action: AppAction) => AppState {
  const withStats = (state: AppState, stats: string[]): AppState => ({
    ...state,
    stats: { ...state.stats, [state.kind]: stats },
  })

  /** Adds a valid, unselected key in canonical order; returns null when nothing changes. */
  const insertStat = (state: AppState, key: string): string[] | null => {
    const order = config.statOrder[state.kind]
    if (!order.includes(key) || state.stats[state.kind].includes(key)) return null
    return [...state.stats[state.kind], key].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }

  return (state, action) => {
    switch (action.type) {
      case 'toggleEntity': {
        const current = state.sel[state.kind]
        let next: EntityId[]
        if (current.includes(action.id)) {
          next = current.filter((id) => id !== action.id)
        } else if (current.length >= MAX_SELECTED) {
          return state
        } else {
          next = [...current, action.id]
        }
        return {
          ...state,
          sel: { ...state.sel, [state.kind]: next },
          addOpen: next.length >= MAX_SELECTED ? false : state.addOpen,
        }
      }
      case 'toggleStat': {
        const current = state.stats[state.kind]
        if (current.includes(action.key)) {
          if (current.length <= 1) return state
          return withStats(
            state,
            current.filter((k) => k !== action.key),
          )
        }
        const next = insertStat(state, action.key)
        return next ? withStats(state, next) : state
      }
      case 'addStat': {
        const next = insertStat(state, action.key)
        if (next) return { ...withStats(state, next), addStatOpen: null }
        return state.addStatOpen === null ? state : { ...state, addStatOpen: null }
      }
      case 'toggleAddStatMenu':
        return { ...state, addStatOpen: state.addStatOpen === action.group ? null : action.group }
      case 'closeAddStatMenu':
        return state.addStatOpen === null ? state : { ...state, addStatOpen: null }
      case 'setKind':
        return { ...state, kind: action.kind, q: '', pos: ALL_POSITIONS, addOpen: false }
      case 'setSeason':
        return action.season === state.season ? state : { ...state, season: action.season }
      case 'setQuery':
        return action.q === state.q ? state : { ...state, q: action.q }
      case 'setPos':
        return action.pos === state.pos ? state : { ...state, pos: action.pos }
      case 'toggleAdd':
        return { ...state, addOpen: !state.addOpen, q: '' }
      case 'closeAdd':
        return state.addOpen ? { ...state, addOpen: false } : state
      case 'setView':
        return action.view === state.view ? state : { ...state, view: action.view }
      case 'setChart2':
        return action.chart2 === state.chart2 ? state : { ...state, chart2: action.chart2 }
      case 'setAxis': {
        const { index, key } = action
        if (index !== 0 && index !== 1 && index !== 2) return state
        if (!config.statOrder[state.kind].includes(key)) return state
        if (state.ax[state.kind][index] === key) return state
        const axes: Axes = [...state.ax[state.kind]]
        axes[index] = key
        return { ...state, ax: { ...state.ax, [state.kind]: axes } }
      }
      case 'setCamera': {
        if (!Number.isFinite(action.yaw) || !Number.isFinite(action.pitch)) return state
        const pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, action.pitch))
        if (action.yaw === state.yaw && pitch === state.pitch && !state.flat) return state
        return { ...state, yaw: action.yaw, pitch, flat: false }
      }
      case 'resetView':
        return withDefaultCamera(state)
      case 'setCameraPreset': {
        if (action.preset === '3d') return withDefaultCamera(state)
        const { yaw, pitch } = FLAT_VIEWS[action.preset]
        if (state.flat && state.yaw === yaw && state.pitch === pitch) return state
        return { ...state, yaw, pitch, flat: true }
      }
      case 'setPlayerMode':
        return action.mode === state.playerMode
          ? state
          : { ...state, playerMode: action.mode, addOpen: false, addStatOpen: null }
      case 'setPlayer':
        // Chosen periods belong to the player they were chosen for.
        return action.playerId === state.playerId
          ? state
          : { ...state, playerId: action.playerId, periods: [] }
      case 'setPeriodStat':
        return action.key === state.periodStat ? state : { ...state, periodStat: action.key }
      case 'togglePeriod': {
        if (!isPeriod(action.period)) return state
        const periods = state.periods.includes(action.period)
          ? state.periods.filter((p) => p !== action.period)
          : sortedPeriods([...state.periods, action.period])
        return { ...state, periods }
      }
      case 'setPeriods': {
        const periods = sortedPeriods(action.periods.filter(isPeriod))
        return periods.join() === state.periods.join() ? state : { ...state, periods }
      }
      case 'setTeamMode':
        return { ...state, teamMode: action.mode, addOpen: false }
      case 'setTeam':
        return action.teamId === state.teamId ? state : { ...state, teamId: action.teamId }
      case 'setUnit':
        return { ...state, unit: action.unit, tSort: { k: config.defaultSortKey, d: -1 } }
      case 'sortRoster':
        return {
          ...state,
          tSort:
            state.tSort.k === action.key
              ? { k: action.key, d: state.tSort.d === -1 ? 1 : -1 }
              : { k: action.key, d: -1 },
        }
      default: {
        const unreachable: never = action
        void unreachable
        return state
      }
    }
  }
}
