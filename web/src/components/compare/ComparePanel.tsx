import { useId, useMemo } from 'react'
import { useAppState, type Chart2Mode, type ViewMode } from '../../state'
import { useEntities } from '../picker/useEntities'
import { useStatDefs } from '../sidebar/useStatDefs'
import { SegmentedControl, TabPanel, Tabs } from '../ui'
import { BarsChart } from './BarsChart'
import { Chart3D } from './Chart3D'
import { RadarChart } from './RadarChart'
import { SeasonDotGraph } from './SeasonDotGraph'
import { resolveColumns, resolveRows } from './tableModel'
import styles from './ComparePanel.module.css'
import { CompareTable } from './CompareTable'
import { DotPlot } from './DotPlot'
import { EmptyState } from './EmptyState'

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'num', label: 'Table' },
  { value: '2d', label: '2D chart' },
  { value: '3d', label: '3D chart' },
]

const CHART_OPTIONS: { value: Chart2Mode; label: string }[] = [
  { value: 'bars', label: 'Bars' },
  { value: 'radar', label: 'Radar' },
]

/** Players get a dot graph with chosen axes; teams keep the dot plot. */
const DOT_LABEL = { players: 'Dot graph', teams: 'Dot plot' } as const

export function ComparePanel() {
  const { state, dispatch } = useAppState()
  const { kind, season, view, chart2, playoffs } = state
  const baseId = useId()
  const entities = useEntities(kind, season, playoffs)
  const defs = useStatDefs(kind)
  const sel = state.sel[kind]
  const statKeys = state.stats[kind]
  const columns = useMemo(() => resolveColumns(sel, entities), [sel, entities])
  const rows = useMemo(() => resolveRows(statKeys, defs), [statKeys, defs])
  const loaded = entities.length > 0 && defs.length > 0
  const hasSelection = sel.length > 0
  const ready = columns.length > 0 && rows.length > 0

  const renderPanel = (value: ViewMode) => {
    if (value !== view) return null
    if (value === '3d' && loaded) return <Chart3D pool={entities} defs={defs} />
    if (!hasSelection) {
      return (
        <div className={styles.content}>
          <EmptyState kind={kind} />
        </div>
      )
    }
    if (!ready || value === '3d') return null
    if (value === 'num') return <CompareTable kind={kind} columns={columns} rows={rows} />
    if (chart2 === 'bars') return <BarsChart columns={columns} rows={rows} pool={entities} />
    if (chart2 === 'dots') {
      return kind === 'players' ? (
        <SeasonDotGraph columns={columns} rows={rows} defs={defs} pool={entities} />
      ) : (
        <DotPlot columns={columns} rows={rows} pool={entities} />
      )
    }
    return <RadarChart columns={columns} rows={rows} pool={entities} />
  }

  return (
    <div className={styles.root}>
      <div className={styles.tabRow}>
        <Tabs
          id={baseId}
          label="View"
          options={VIEW_OPTIONS}
          value={view}
          onChange={(v) => dispatch({ type: 'setView', view: v })}
          className={styles.tabs}
        />
        {view === '2d' && (
          <div className={styles.chartType}>
            <SegmentedControl
              label="Chart type"
              size="sm"
              options={[...CHART_OPTIONS, { value: 'dots', label: DOT_LABEL[kind] }]}
              value={chart2}
              onChange={(c) => dispatch({ type: 'setChart2', chart2: c })}
            />
          </div>
        )}
      </div>
      {VIEW_OPTIONS.map((o) => (
        <TabPanel key={o.value} id={baseId} value={o.value} hidden={o.value !== view}>
          {renderPanel(o.value)}
        </TabPanel>
      ))}
    </div>
  )
}
