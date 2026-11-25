import { useMemo } from 'react'
import type { Entity, StatDef } from '../../domain/types'
import { useAppState } from '../../state'
import { DotGraph } from '../dotgraph/DotGraph'
import { Select } from '../ui'
import { axisOptions } from './chart3dModel'
import { rowGraph, scatterGraph } from './seasonDotModel'
import type { CompareColumn } from './tableModel'
import styles from './SeasonDotGraph.module.css'

interface Props {
  columns: CompareColumn[]
  /** Stats picked in the sidebar; the first is the starting x axis. */
  rows: StatDef[]
  defs: readonly StatDef[]
  pool: readonly Entity[]
}

/** Value of the y select that leaves only the x axis. */
const NO_Y = ''

/** Season totals as a dot graph: one stat along x, or one stat against another. */
export function SeasonDotGraph({ columns, rows, defs, pool }: Props) {
  const { state, dispatch } = useAppState()
  const options = useMemo(() => axisOptions(defs), [defs])
  const find = (key: string) => defs.find((d) => d.key === key)
  const x = find(state.dotX) ?? rows[0]
  const y = find(state.dotY)
  const graph = useMemo(
    () => (y ? scatterGraph(columns, pool, x, y) : rowGraph(columns, pool, x)),
    [columns, pool, x, y],
  )

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <div className={styles.field}>
          <span>X axis</span>
          <Select
            label="Graph X axis"
            options={options}
            value={x.key}
            onChange={(key) => dispatch({ type: 'setDotX', key })}
          />
        </div>
        <div className={styles.field}>
          <span>Y axis</span>
          <Select
            label="Graph Y axis"
            options={[{ value: NO_Y, label: 'None (X axis only)' }, ...options]}
            value={y?.key ?? NO_Y}
            onChange={(key) => dispatch({ type: 'setDotY', key })}
          />
        </div>
      </div>
      <div className={styles.card}>
        <DotGraph label="Dot graph" model={graph.model} rows={!y} />
      </div>
      {graph.missing.length > 0 && (
        <p className={styles.note}>No value, so not plotted: {graph.missing.join(', ')}</p>
      )}
      <p className={styles.note}>
        {y
          ? 'Colored dots = selected players · gray dots = rest of league · hover a dot for values'
          : 'One row for each selected player'}
        {x.lowerIsBetter || y?.lowerIsBetter ? ' · axes are not flipped for lower is better' : ''}
      </p>
    </div>
  )
}
