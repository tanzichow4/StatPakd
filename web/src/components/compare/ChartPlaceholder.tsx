import styles from './ChartPlaceholder.module.css'

export function ChartPlaceholder({ title }: { title: string }) {
  return <div className={styles.box}>{`${title} — coming soon`}</div>
}
