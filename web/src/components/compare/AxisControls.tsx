import type { AxisIndex } from '../../state'
import type { SelectOption } from '../ui/Select'
import { Select } from '../ui/Select'
import styles from './AxisControls.module.css'

const LETTERS = ['X', 'Y', 'Z'] as const
const INDEXES: readonly AxisIndex[] = [0, 1, 2]

interface Props {
  options: SelectOption[]
  axes: readonly [string, string, string]
  onAxis: (index: AxisIndex, key: string) => void
  onReset: () => void
}

export function AxisControls({ options, axes, onAxis, onReset }: Props) {
  return (
    <div className={styles.root}>
      {LETTERS.map((letter, i) => (
        <label key={letter} className={styles.field}>
          <span className={styles.letter}>{letter}</span>
          <Select
            label={`${letter} axis`}
            options={options}
            value={axes[i]}
            placeholder="Choose a stat"
            onChange={(key) => onAxis(INDEXES[i], key)}
            className={styles.select}
          />
        </label>
      ))}
      <button type="button" className={styles.reset} onClick={onReset}>
        Reset view
      </button>
    </div>
  )
}
