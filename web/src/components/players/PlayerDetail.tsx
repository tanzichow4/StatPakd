import { useEffect, useId, useMemo } from 'react'
import { useAppState } from '../../state'
import { useEntities } from '../picker/useEntities'
import { useStatDefs } from '../sidebar/useStatDefs'
import { TeamHeader } from '../teams/TeamHeader'
import { summaryRow } from './headerModel'
import { Select } from '../ui'
import { GameLogTable } from './GameLogTable'
import { PlayerPicker } from './PlayerPicker'
import {
  activePlayer,
  chartStat,
  chosenEntries,
  describeTrend,
  statsWithData,
  trendChart,
  trendPoints,
} from './playerModel'
import { TrendChart } from './TrendChart'
import { useGameLog } from './useGameLog'
import { WeekCompare } from './WeekCompare'
import styles from './PlayerDetail.module.css'

/** One player: season totals, a week-by-week dot plot, the game log and a week comparison. */
export function PlayerDetail() {
  const { state, dispatch } = useAppState()
  const { season } = state
  const players = useEntities('players', season)
  const defs = useStatDefs('players')
  const player = activePlayer(players, state.playerId, state.sel.players)

  // The stat sidebar is hidden here, so its menu must not stay open.
  useEffect(() => {
    dispatch({ type: 'closeAddStatMenu' })
  }, [dispatch])

  if (!player || defs.length === 0) return null

  return (
    <div className={styles.root}>
      <PlayerPicker
        players={players}
        activeId={player.id}
        onSelect={(playerId) => dispatch({ type: 'setPlayer', playerId })}
      />
      <TeamHeader
        badge={player.badge}
        name={player.name}
        meta={`${player.meta} · ${season}`}
        summary={summaryRow(defs, player.stats, state.stats.players)}
      />
      <PlayerSeason key={player.id} playerId={player.id} />
    </div>
  )
}

function PlayerSeason({ playerId }: { playerId: string }) {
  const { state, dispatch } = useAppState()
  const headingId = useId()
  const log = useGameLog(playerId, state.season)
  const defs = useStatDefs('players')
  const available = useMemo(() => statsWithData(defs, log ?? []), [defs, log])
  const stat = chartStat(available, state.periodStat, state.stats.players)

  if (log === null) return null
  if (!stat) return <p className={styles.hint}>No weekly data for this player.</p>

  const chosen = chosenEntries(log, state.periods).map((e) => e.period)
  const main = available.filter((d) => !d.extra)
  const model = trendChart(log, stat)
  const trend = describeTrend(trendPoints(log, stat.key), stat)
  const toggle = (period: number) => dispatch({ type: 'togglePeriod', period })

  return (
    <>
      <p className={styles.sample}>
        Sample data: weekly values are generated for design purposes, not real game results.
      </p>
      <section aria-labelledby={headingId} className={styles.section}>
        <div className={styles.titleRow}>
          <h3 id={headingId} className={styles.heading}>
            Week by week
          </h3>
          <Select
            label="Weekly stat"
            options={available.map((d) => ({ value: d.key, label: d.label }))}
            value={stat.key}
            onChange={(key) => dispatch({ type: 'setPeriodStat', key })}
          />
        </div>
        <p className={styles.trendText} data-testid="season-trend">
          {[model.average && `Average ${model.average.text}`, trend?.text]
            .filter(Boolean)
            .join(' · ')}
          {stat.lowerIsBetter ? ' · lower is better' : ''}
        </p>
        <div className={styles.card}>
          <TrendChart
            label={`${stat.label} by week`}
            model={model}
            showLines
            chosen={chosen}
            onToggle={toggle}
          />
        </div>
        <p className={styles.legend}>
          Red line = trend · dashed line = season average · pick dots to compare weeks
        </p>
        <GameLogTable log={log} defs={main} chosen={chosen} onToggle={toggle} />
      </section>
      <WeekCompare
        log={log}
        defs={main}
        chosen={chosen}
        onToggle={toggle}
        onChoose={(periods) => dispatch({ type: 'setPeriods', periods })}
      />
    </>
  )
}
