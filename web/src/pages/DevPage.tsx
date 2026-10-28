import { useState } from 'react'

import {
  Checkbox,
  Chip,
  IconButton,
  Pill,
  SegmentedControl,
  Select,
  TabPanel,
  Tabs,
} from '../components/ui'
import { SERIES_COUNT, seriesColor } from '../styles/series'
import styles from './DevPage.module.css'

type Kind = 'players' | 'teams'
type View = 'num' | '2d' | '3d'

/** Visual check of every UI primitive. Served at /dev; not linked from the app. */
export default function DevPage() {
  const [kind, setKind] = useState<Kind>('players')
  const [mode, setMode] = useState<'compare' | 'inside'>('compare')
  const [view, setView] = useState<View>('num')
  const [checked, setChecked] = useState(true)
  const [pos, setPos] = useState('All')
  const [season, setSeason] = useState('2024')

  const seasons = [
    { value: '2024', label: '2024 Regular Season' },
    { value: '2023', label: '2023 Regular Season' },
  ]

  return (
    <main className={styles.page}>
      <h1>UI primitives</h1>

      <section>
        <h2>Series colors</h2>
        <div className={styles.row}>
          {Array.from({ length: SERIES_COUNT }, (_, i) => (
            <span key={i} className={styles.swatch} style={{ background: seriesColor(i) }} />
          ))}
        </div>
      </section>

      <section>
        <h2>SegmentedControl</h2>
        <div className={styles.row}>
          <SegmentedControl
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'compare', label: 'Compare teams' },
              { value: 'inside', label: 'Team breakdown' },
            ]}
          />
          <div className={styles.dark}>
            <SegmentedControl
              variant="dark"
              label="Kind"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'players', label: 'Players' },
                { value: 'teams', label: 'Teams' },
              ]}
            />
            <Select
              variant="dark"
              label="Season"
              value={season}
              onChange={setSeason}
              options={seasons}
            />
          </div>
        </div>
      </section>

      <section>
        <h2>Tabs</h2>
        <Tabs
          id="dev-view"
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'num', label: 'Table' },
            { value: '2d', label: '2D chart' },
            { value: '3d', label: '3D chart' },
          ]}
        />
        <TabPanel id="dev-view" value={view}>
          <p>Panel: {view}</p>
        </TabPanel>
      </section>

      <section>
        <h2>Checkbox, Pill, IconButton, Select</h2>
        <div className={styles.row}>
          <Checkbox label="Pass Yds" checked={checked} onChange={setChecked} />
          <Checkbox label="Disabled" checked disabled onChange={() => {}} />
          <Pill>
            <span className="mono">3,731</span>
          </Pill>
          <IconButton label="Remove" onClick={() => {}}>
            ×
          </IconButton>
          <Select label="Season" value={season} onChange={setSeason} options={seasons} />
        </div>
      </section>

      <section>
        <h2>Chip</h2>
        <div className={styles.row}>
          {['All', 'QB', 'RB', 'WR', 'TE'].map((p) => (
            <Chip key={p} active={pos === p} onClick={() => setPos(p)}>
              {p}
            </Chip>
          ))}
          <Chip active mono onClick={() => {}}>
            PHI
          </Chip>
        </div>
      </section>
    </main>
  )
}
