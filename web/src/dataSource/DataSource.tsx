import type { ReactNode } from 'react'
import type { DataProvider } from '../domain/provider'
import { DataProviderContext } from './dataProviderContext'

export interface DataSourceProps {
  provider: DataProvider
  children: ReactNode
}

/**
 * Supplies the data provider to the tree. The provider instance should be stable:
 * create it once (module scope or `useState`), not on every render.
 */
export function DataSource({ provider, children }: DataSourceProps) {
  return <DataProviderContext.Provider value={provider}>{children}</DataProviderContext.Provider>
}
