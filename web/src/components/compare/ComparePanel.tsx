import { useId, useMemo } from 'react'
import { useAppState, type Chart2Mode, type ViewMode } from '../../state'
import { useEntities } from '../picker/useEntities'
import { useStatDefs } from '../sidebar/useStatDefs'
import { SegmentedControl, TabPanel, Tabs } from '../ui'
import { ChartPlaceholder } from './ChartPlaceholder'
import { resolveColumns, resolveRows } from './tableModel'
import styles from './ComparePanel.module.css'
import { CompareTable } from './CompareTable'
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

export function ComparePanel() {
  const { state, dispatch } = useAppState()
  const { kind, season, view, chart2 } = state
  const baseId = useId()
  const entities = useEntities(kind, season)
  const defs = useStatDefs(kind)
  const sel = state.sel[kind]
  const statKeys = state.stats[kind]
  const columns = useMemo(() => resolveColumns(sel, entities), [sel, entities])
  const rows = useMemo(() => resolveRows(statKeys, defs), [statKeys, defs])
  const hasSelection = sel.length > 0
  const ready = columns.length > 0 && rows.length > 0

  const renderPanel = (value: ViewMode) => {
    if (value !== view) return null
    const placeholder3d = value === '3d' ? <ChartPlaceholder title="3D chart" /> : null
    if (!hasSelection) {
      return (
        <div className={styles.content}>
          <EmptyState kind={kind} />
          {placeholder3d}
        </div>
      )
    }
    if (!ready) return placeholder3d
    if (value === 'num') return <CompareTable kind={kind} columns={columns} rows={rows} />
    if (value === '2d') {
      return <ChartPlaceholder title={chart2 === 'bars' ? 'Bars chart' : 'Radar chart'} />
    }
    return placeholder3d
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
              options={CHART_OPTIONS}
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
