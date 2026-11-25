import { useCallback, useState, type ReactNode } from 'react'
import { AnnounceContext } from './announceContext'
import styles from './Announcer.module.css'

// A trailing non-breaking space toggles so a repeated message still changes the node text.
const NBSP = ' '

/** Hosts one polite live region and provides `announce` to descendants. */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('')
  const announce = useCallback((message: string) => {
    setText((prev) => (prev === message ? message + NBSP : message))
  }, [])
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <output aria-live="polite" aria-atomic="true" className={styles.region}>
        {text}
      </output>
    </AnnounceContext.Provider>
  )
}
