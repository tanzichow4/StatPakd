import type { LegendItem } from './shareModel'
import styles from './ShareLegend.module.css'

interface Props {
  items: readonly LegendItem[]
}

/** Colour legend of the roster, in roster order. */
export function ShareLegend({ items }: Props) {
  return (
    <ul aria-label="Legend" className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <span className={styles.swatch} style={{ background: item.color }} />
          {item.name}
        </li>
      ))}
    </ul>
  )
}
