import { useEffect, useMemo } from 'react'
import { seriesColor } from '../../styles/series'
import { useAppState, type WeekGraphMode } from '../../state'
import { EmptyState } from '../compare/EmptyState'
import { resolveColumns } from '../compare/tableModel'
import { DotGraph } from '../dotgraph/DotGraph'
import { useEntities } from '../picker/useEntities'
import { useStatDefs } from '../sidebar/useStatDefs'
import { Checkbox, SegmentedControl, Select, type SegmentedOption } from '../ui'
import { TotalsPanel } from './TotalsPanel'
import { useGameLogs } from './useGameLogs'
import { PlayerWeekTable, StatWeekTable } from './WeekTable'
import { WeekSelector } from './WeekSelector'
import {
  allPeriods,
  chosenPeriods,
  groupedTotals,
  periodGraph,
  pickStat,
  playerTrends,
  recentPeriods,
  statGraph,
  statsWithData,
} from './weekModel'
import styles from './Weeks.module.css'

const GRAPHS: SegmentedOption<WeekGraphMode>[] = [
  { value: 'week', label: 'By week' },
  { value: 'stats', label: 'Stat vs stat' },
]

/** Week to week: pick weeks, then see a dot graph, a table and totals for the chosen players. */
export function WeekView() {
  const { state, dispatch } = useAppState()
  const { season, weekGraph, trend } = state
  const players = useEntities('players', season)
  const defs = useStatDefs('players')
  const sel = state.sel.players
  const columns = useMemo(() => resolveColumns(sel, players), [sel, players])
  const ids = useMemo(() => columns.map((c) => c.entity.id), [columns])
  const logs = useGameLogs(ids, season)

  // The stat sidebar is hidden here, so its menu must not stay open.
  useEffect(() => {
    dispatch({ type: 'closeAddStatMenu' })
  }, [dispatch])

  if (players.length === 0 || defs.length === 0) return null
  if (columns.length === 0) return <EmptyState kind="players" />
  if (logs === null) return null

  const periods = allPeriods(logs)
  const chosen = chosenPeriods(periods, state.periods)
  const available = statsWithData(defs, logs)
  const preferred = state.stats.players
  const y = pickStat(available, [state.weekY, ...preferred])
  if (!y) return <p className={styles.hint}>No weekly data for these players.</p>
  const x = pickStat(available, [state.weekX, ...preferred.filter((k) => k !== y.key)], 1) ?? y
  const versus = weekGraph === 'stats'
  const model = versus
    ? statGraph(columns, logs, x, y, chosen, trend)
    : periodGraph(columns, logs, y, chosen, trend)
  const options = available.map((d) => ({ value: d.key, label: d.label }))
  const graphY = (key: string) => dispatch({ type: 'setWeekY', key })

  return (
    <div className={styles.root}>
      <WeekSelector
        periods={periods}
        chosen={chosen}
        recent={recentPeriods(periods, logs)}
        onChoose={(list) => dispatch({ type: 'setPeriods', periods: list })}
      />
      {chosen.length === 0 ? (
        <p className={styles.hint}>Pick at least one week.</p>
      ) : (
        <div className={styles.body}>
          <div className={styles.main}>
            <div className={styles.controls}>
              <SegmentedControl
                label="Graph type"
                size="sm"
                options={GRAPHS}
                value={weekGraph}
                onChange={(mode) => dispatch({ type: 'setWeekGraph', mode })}
              />
              {versus && (
                <div className={styles.field}>
                  <span>X axis</span>
                  <Select
                    label="Weekly X axis"
                    options={options}
                    value={x.key}
                    onChange={(key) => dispatch({ type: 'setWeekX', key })}
                  />
                </div>
              )}
              <div className={styles.field}>
                <span>{versus ? 'Y axis' : 'Stat'}</span>
                <Select
                  label={versus ? 'Weekly Y axis' : 'Weekly stat'}
                  options={options}
                  value={y.key}
                  onChange={graphY}
                />
              </div>
              <Checkbox
                label="Trend lines"
                checked={trend}
                onChange={() => dispatch({ type: 'toggleTrend' })}
                className={styles.check}
              />
            </div>
            <div className={styles.card}>
              <ul className={styles.legend} aria-label="Players in the graph">
                {columns.map(({ entity, colorIndex }) => (
                  <li key={entity.id} className={styles.legendItem}>
                    <span
                      aria-hidden="true"
                      className={styles.swatch}
                      style={{ background: seriesColor(colorIndex) }}
                    />
                    {entity.name}
                  </li>
                ))}
              </ul>
              <DotGraph label="Weekly dot graph" model={model} />
            </div>
            {!versus && (
              <ul className={styles.trends} aria-label={`${y.label} trends`}>
                {playerTrends(columns, logs, y, chosen).map((t) => (
                  <li key={t.id} className={styles.legendItem}>
                    <span
                      aria-hidden="true"
                      className={styles.swatch}
                      style={{ background: seriesColor(t.colorIndex) }}
                    />
                    <strong>{t.name}</strong> {t.text}
                  </li>
                ))}
              </ul>
            )}
            {columns.length === 1 ? (
              <PlayerWeekTable column={columns[0]} logs={logs} defs={available} periods={chosen} />
            ) : (
              (versus && x.key !== y.key ? [x, y] : [y]).map((def) => (
                <StatWeekTable
                  key={def.key}
                  columns={columns}
                  logs={logs}
                  def={def}
                  periods={chosen}
                />
              ))
            )}
          </div>
          <TotalsPanel
            columns={columns}
            groups={groupedTotals(columns, logs, available, chosen)}
            weekCount={chosen.length}
            graphed={y.key}
            onGraph={graphY}
          />
        </div>
      )}
    </div>
  )
}
