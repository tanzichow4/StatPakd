import { useContext } from 'react'
import { AnnounceContext } from './announceContext'

const noop = () => {}

/** Returns `announce(message)`; a no-op outside an AnnouncerProvider. */
export function useAnnounce(): (message: string) => void {
  return useContext(AnnounceContext) ?? noop
}
