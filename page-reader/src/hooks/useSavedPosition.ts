import { useStoredValue } from './useStoredValue'

function isSavedCfi(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.startsWith('epubcfi('))
}

export function useSavedPosition(bookId: string) {
  return useStoredValue<string | null>(`reader-position:${bookId}`, null, isSavedCfi)
}
