import { useEffect, useState } from 'react'
import { searchCatalog } from '../services/catalog'
import { useDebouncedValue } from './useDebouncedValue'
import type { CatalogResult } from '../types/catalogResult'

export type CatalogSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; results: CatalogResult[] }

interface SearchResult {
  query: string
  state: Exclude<CatalogSearchState, { status: 'idle' } | { status: 'loading' }>
}

export function useCatalogSearch(query: string): CatalogSearchState {
  const normalizedQuery = query.trim()
  const debouncedQuery = useDebouncedValue(normalizedQuery, 350)
  const [result, setResult] = useState<SearchResult | null>(null)

  useEffect(() => {
    if (!debouncedQuery) return

    const controller = new AbortController()
    void searchCatalog(debouncedQuery, controller.signal).then(
      (results) => setResult({ query: debouncedQuery, state: { status: 'success', results } }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setResult({
          query: debouncedQuery,
          state: {
            status: 'error',
            message: error instanceof Error ? error.message : 'The catalog search failed.',
          },
        })
      },
    )

    return () => controller.abort()
  }, [debouncedQuery])

  if (!normalizedQuery) return { status: 'idle' }
  if (normalizedQuery !== debouncedQuery) return { status: 'loading' }
  if (!result || result.query !== debouncedQuery) return { status: 'loading' }
  return result.state
}
