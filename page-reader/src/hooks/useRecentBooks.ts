import { useCallback } from 'react'
import { useStoredValue } from './useStoredValue'
import type { RecentBook } from '../types/book'

function isRecentBook(value: unknown): value is RecentBook {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.lastOpened !== 'string' ||
    Number.isNaN(Date.parse(candidate.lastOpened))
  ) {
    return false
  }
  if (candidate.source === 'local') return true
  return (
    candidate.source === 'gutenberg' &&
    typeof candidate.gutenbergId === 'number' &&
    Number.isInteger(candidate.gutenbergId)
  )
}

function isRecentBookList(value: unknown): value is RecentBook[] {
  return Array.isArray(value) && value.every(isRecentBook)
}

export function useRecentBooks() {
  const stored = useStoredValue<RecentBook[]>('reader-recent-books', [], isRecentBookList)
  const setRecentBooks = stored.setValue
  const addRecentBook = useCallback(
    (book: RecentBook) => {
      setRecentBooks((books) => [
        book,
        ...books.filter((existing) => existing.id !== book.id),
      ].slice(0, 10))
    },
    [setRecentBooks],
  )

  return {
    recentBooks: stored.value,
    addRecentBook,
    error: stored.error,
  }
}
