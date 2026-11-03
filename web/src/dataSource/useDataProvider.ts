import { useContext } from 'react'
import type { DataProvider } from '../domain/provider'
import { DataProviderContext } from './dataProviderContext'

export function useDataProvider(): DataProvider {
  const provider = useContext(DataProviderContext)
  if (!provider) throw new Error('useDataProvider must be used inside <DataSource>')
  return provider
}
