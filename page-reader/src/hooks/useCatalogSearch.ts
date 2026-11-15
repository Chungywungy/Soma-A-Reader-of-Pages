import { useEffect, useState } from 'react'
import { searchCatalog } from '../services/catalog'
import { useDebouncedValue } from './useDebouncedValue'
import type { CatalogResult } from '../types/catalogResult'

export type CatalogSearchState =
  | { status: 'idle' }
  | { status: 'tooShort' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; results: CatalogResult[] }

interface SearchResult {
  query: string
  state: Exclude<CatalogSearchState, { status: 'idle' } | { status: 'loading' }>
}

const MIN_QUERY_LENGTH = 3

function findCachedPrefixResults(
  search: string,
  cachedResults: ReadonlyMap<string, CatalogResult[]>,
): CatalogResult[] | null {
  const normalizedSearch = search.toLocaleLowerCase()
  const matchingPrefixes = [...cachedResults.entries()]
    .filter(
      ([cachedQuery]) =>
        cachedQuery.length >= MIN_QUERY_LENGTH &&
        cachedQuery.length < search.length &&
        normalizedSearch.startsWith(cachedQuery.toLocaleLowerCase()),
    )
    .sort(([first], [second]) => second.length - first.length)

  for (const [, results] of matchingPrefixes) {
    const matches = results.filter(
      ({ title, author }) =>
        title.toLocaleLowerCase().includes(normalizedSearch) ||
        author.toLocaleLowerCase().includes(normalizedSearch),
    )
    if (matches.length > 0) return matches
  }

  return null
}

export function useCatalogSearch(query: string): CatalogSearchState {
  const normalizedQuery = query.trim()
  const debouncedQuery = useDebouncedValue(normalizedQuery, 150)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [cachedResults, setCachedResults] = useState(
    () => new Map<string, CatalogResult[]>(),
  )

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) return

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
          setCachedResults((previous) => new Map(previous).set(debouncedQuery, results))
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
  if (normalizedQuery.length < MIN_QUERY_LENGTH) return { status: 'tooShort' }
  if (normalizedQuery !== debouncedQuery) return { status: 'loading' }
  if (
    result?.query === debouncedQuery &&
    result.state.status === 'success'
  ) {
    return result.state
  }
  const cachedPrefixResults = findCachedPrefixResults(debouncedQuery, cachedResults)
  if (cachedPrefixResults) return { status: 'success', results: cachedPrefixResults }
  if (!result || result.query !== debouncedQuery) return { status: 'loading' }
  return result.state
}
