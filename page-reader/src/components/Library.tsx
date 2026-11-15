import { useRef, useState, type ChangeEvent } from 'react'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { fetchEpub } from '../services/catalog'
import type { BookData, RecentBook } from '../types/book'
import type { CatalogResult } from '../types/catalogResult'

interface LibraryProps {
  recentBooks: RecentBook[]
  onOpenBook: (book: BookData) => void
  onResumeBook: (book: RecentBook) => Promise<void>
  resumingId: number | null
  error: string | null
  storageError: string | null
}

function Library({
  recentBooks,
  onOpenBook,
  onResumeBook,
  resumingId,
  error,
  storageError,
}: LibraryProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [loadingBookId, setLoadingBookId] = useState<number | null>(null)
  const catalogSearch = useCatalogSearch(query)

  const chooseLocalFile = () => fileInput.current?.click()

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    setFileError(null)
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.epub')) {
      setFileError('Choose a file with the .epub extension.')
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      if (buffer.byteLength === 0) {
        throw new Error('The selected EPUB file is empty.')
      }
      onOpenBook({
        id: `local:${file.name}:${file.size}:${file.lastModified}`,
        title: file.name.replace(/\.epub$/i, ''),
        source: 'local',
        buffer,
      })
    } catch (caught) {
      setFileError(
        caught instanceof Error ? caught.message : 'The selected file could not be read.',
      )
    }
  }

  const handleCatalogBook = async (result: CatalogResult) => {
    setDownloadError(null)
    setLoadingBookId(result.id)
    try {
      const buffer = await fetchEpub(result.epubUrl)
      onOpenBook({
        id: `gutenberg:${result.id}`,
        title: result.title,
        source: 'gutenberg',
        gutenbergId: result.id,
        buffer,
      })
    } catch (caught) {
      setDownloadError(
        caught instanceof Error ? caught.message : 'The book could not be downloaded.',
      )
    } finally {
      setLoadingBookId(null)
    }
  }

  return (
    <section className="library-screen">
      <header className="library-header">
        <p className="eyebrow">A Reader of Pages</p>
        <h1>Your reading room</h1>
        <p>Open a DRM-free EPUB you own or find a public-domain book.</p>
      </header>

      <section className="library-section" aria-labelledby="local-book-title">
        <h2 id="local-book-title">Open a local book</h2>
        <p>Choose an EPUB file from your device. Your file stays in this browser.</p>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept=".epub,application/epub+zip"
          aria-label="Choose an EPUB file"
          onChange={handleFileChange}
        />
        <button className="primary-button" type="button" onClick={chooseLocalFile}>
          Choose EPUB
        </button>
        {fileError && <p className="message error-message" role="alert">{fileError}</p>}
      </section>

      <section className="library-section" aria-labelledby="catalog-title">
        <h2 id="catalog-title">Public-domain library</h2>
        <label className="search-label" htmlFor="book-search">Search Project Gutenberg</label>
        <input
          id="book-search"
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search by title or author"
        />
        <div className="catalog-results" aria-live="polite">
          {catalogSearch.status === 'idle' && (
            <p className="muted">Enter a title or author to search the catalog.</p>
          )}
          {catalogSearch.status === 'tooShort' && (
            <p className="muted">Enter at least 3 characters for more useful results.</p>
          )}
          {catalogSearch.status === 'loading' && <p>Searching…</p>}
          {catalogSearch.status === 'error' && (
            <p className="message error-message" role="alert">{catalogSearch.message}</p>
          )}
          {catalogSearch.status === 'success' && (
            catalogSearch.results.length > 0 ? (
              <ul className="book-list">
                {catalogSearch.results.map((result) => (
                  <li className="book-card" key={result.id}>
                    <div>
                      <h3>{result.title}</h3>
                      <p>{result.author}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCatalogBook(result)}
                      disabled={loadingBookId !== null}
                    >
                      {loadingBookId === result.id ? 'Downloading…' : 'Read'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No EPUB books matched that search.</p>
            )
          )}
        </div>
        {downloadError && (
          <p className="message error-message" role="alert">{downloadError}</p>
        )}
      </section>

      {recentBooks.length > 0 && (
        <section className="library-section" aria-labelledby="recent-title">
          <h2 id="recent-title">Recent books</h2>
          <ul className="book-list recent-list">
            {recentBooks.map((recent) => (
              <li className="book-card" key={recent.id}>
                <div>
                  <h3>{recent.title}</h3>
                  <p>
                    Last opened {new Date(recent.lastOpened).toLocaleString()}
                    {recent.source === 'local' && ' · Choose the file again to resume.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (recent.source === 'local') chooseLocalFile()
                    else void onResumeBook(recent)
                  }}
                  disabled={
                    recent.source === 'gutenberg' &&
                    resumingId === recent.gutenbergId
                  }
                >
                  {recent.source === 'gutenberg' && resumingId === recent.gutenbergId
                    ? 'Downloading…'
                    : 'Resume'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(error || storageError) && (
        <div className="notices" role="status">
          {error && <p className="message error-message">{error}</p>}
          {storageError && <p className="message">{storageError}</p>}
        </div>
      )}
    </section>
  )
}

export default Library
