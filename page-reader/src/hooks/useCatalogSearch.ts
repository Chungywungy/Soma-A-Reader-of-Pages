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
  const debouncedQuery = useDebouncedValue(normalizedQuery, 150)
  const [result, setResult] = useState<SearchResult | null>(null)

  useEffect(() => {
    if (!debouncedQuery) return

    const controller = new AbortController()
    let stale = false
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 8000)

    void searchCatalog(debouncedQuery, controller.signal).then(
      (results) => {
        window.clearTimeout(timeout)
        if (!stale) {
          setResult({ query: debouncedQuery, state: { status: 'success', results } })
        }
      },
      (error: unknown) => {
        window.clearTimeout(timeout)
        if (stale) return
        setResult({
          query: debouncedQuery,
          state: {
            status: 'error',
            message: timedOut
              ? 'The catalog search timed out. Please try again.'
              : error instanceof Error
                ? error.message
                : 'The catalog search failed.',
          },
        })
      },
    )

    return () => {
      stale = true
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [debouncedQuery])

  if (!normalizedQuery) return { status: 'idle' }
  if (normalizedQuery !== debouncedQuery) return { status: 'loading' }
  if (!result || result.query !== debouncedQuery) return { status: 'loading' }
  return result.state
}
