import { useState } from 'react'
import Library from './Library'
import Reader from './Reader'
import { fetchBookById } from '../services/catalog'
import { useRecentBooks } from '../hooks/useRecentBooks'
import type { BookData, RecentBook } from '../types/book'
import type { Theme } from '../types/theme'
import { useStoredValue } from '../hooks/useStoredValue'
import { isTheme } from '../types/theme'

function App() {
  const [book, setBook] = useState<BookData | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [resumingId, setResumingId] = useState<number | null>(null)
  const savedTheme = useStoredValue<Theme>('reader-theme', 'light', isTheme)
  const theme = savedTheme.value
  const setTheme = savedTheme.setValue
  const { recentBooks, addRecentBook, error: storageError } = useRecentBooks()
  const storageMessage = [savedTheme.error, storageError]
    .filter((message): message is string => message !== null)
    .join(' ')

  const openBook = (nextBook: BookData) => {
    setResumeError(null)
    setBook(nextBook)
    addRecentBook({
      id: nextBook.id,
      title: nextBook.title,
      source: nextBook.source,
      lastOpened: new Date().toISOString(),
      ...(nextBook.gutenbergId === undefined
        ? {}
        : { gutenbergId: nextBook.gutenbergId }),
    })
  }

  const resumeBook = async (recent: RecentBook) => {
    if (recent.gutenbergId === undefined) {
      setResumeError('This library entry is missing its Project Gutenberg book ID.')
      return
    }

    setResumeError(null)
    setResumingId(recent.gutenbergId)
    try {
      const restored = await fetchBookById(recent.gutenbergId)
      openBook({
        id: `gutenberg:${restored.id}`,
        title: restored.title,
        source: 'gutenberg',
        gutenbergId: restored.id,
        buffer: restored.buffer,
      })
    } catch (error) {
      setResumeError(
        error instanceof Error ? error.message : 'The book could not be downloaded.',
      )
    } finally {
      setResumingId(null)
    }
  }

  return (
    <main className={`app-shell theme-${theme}`}>
      {book ? (
        <Reader
          key={book.id}
          book={book}
          theme={theme}
          setTheme={setTheme}
          storageError={storageMessage || null}
          onClose={() => setBook(null)}
        />
      ) : (
        <Library
          recentBooks={recentBooks}
          onOpenBook={openBook}
          onResumeBook={resumeBook}
          resumingId={resumingId}
          error={resumeError}
          storageError={storageMessage || null}
        />
      )}
    </main>
  )
}

export default App
