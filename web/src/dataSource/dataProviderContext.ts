import { createContext } from 'react'
import type { DataProvider } from '../domain/provider'

export const DataProviderContext = createContext<DataProvider | null>(null)
