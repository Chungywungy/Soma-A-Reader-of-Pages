import { useCallback, useEffect, useRef, useState } from 'react'
import ePub, { type EpubParser, type Book as EpubBook, type Rendition } from 'epubjs'
import Toolbar from './Toolbar'
import TocPanel from './TocPanel'
import { useStoredValue } from '../hooks/useStoredValue'
import { useSavedPosition } from '../hooks/useSavedPosition'
import type { BookData } from '../types/book'
import type { Chapter } from '../types/chapter'
import type { Theme } from '../types/theme'

interface ReaderProps {
  book: BookData
  theme: Theme
  setTheme: (theme: Theme) => void
  onClose: () => void
  storageError: string | null
}

type LoadState =
  | { bookId: string; status: 'loading' }
  | { bookId: string; status: 'ready'; chapters: Chapter[] }
  | { bookId: string; status: 'error'; message: string }

function chaptersFrom(items: EpubBook['toc']): Chapter[] {
  const chapters: Chapter[] = []
  const seenLocations = new Set<string>()

  const addItems = (entries: EpubBook['toc']) => {
    for (const entry of entries) {
      if (entry.href && !seenLocations.has(entry.href)) {
        seenLocations.add(entry.href)
        chapters.push({ label: entry.title, location: entry.href })
      }
      if (entry.children) addItems(entry.children)
    }
  }

  addItems(items)
  return chapters
}

function Reader({ book, theme, setTheme, onClose, storageError }: ReaderProps) {
  const pagesElement = useRef<HTMLDivElement>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const [showToc, setShowToc] = useState(false)
  const savedFontSize = useStoredValue('reader-font-size', 100, isFontSize)
  const savedPosition = useSavedPosition(book.id)
  const setSavedPosition = savedPosition.setValue
  const savedPositionRef = useRef(savedPosition.value)
  useEffect(() => {
    savedPositionRef.current = savedPosition.value
  }, [savedPosition.value])
  const [loadState, setLoadState] = useState<LoadState>({
    bookId: book.id,
    status: 'loading',
  })
  const isReady = loadState.bookId === book.id && loadState.status === 'ready'
  const isLoading = loadState.bookId !== book.id || loadState.status === 'loading'
  const errorMessage =
    loadState.bookId === book.id && loadState.status === 'error'
      ? loadState.message
      : null
  const chapters =
    loadState.bookId === book.id && loadState.status === 'ready'
      ? loadState.chapters
      : []

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target
    if (target !== null && typeof target === 'object' && 'nodeName' in target) {
      const nodeName = String(target.nodeName).toLowerCase()
      if (
        ['input', 'textarea', 'select'].includes(nodeName) ||
        ('isContentEditable' in target && target.isContentEditable === true)
      ) {
        return
      }
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      void renditionRef.current?.prev()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      void renditionRef.current?.next()
    }
  }, [])

  useEffect(() => {
    const element = pagesElement.current
    if (!element) return

    let active = true
    let epubParser: EpubParser | null = null
    let loadedBook: EpubBook | null = null
    let rendition: Rendition | null = null

    const saveLocation = (location: { start: { cfi: string } }) => {
      setSavedPosition(location.start.cfi)
    }

    const load = async () => {
      try {
        epubParser = await ePub()
        if (!active) {
          epubParser.destroy()
          epubParser = null
          return
        }
        loadedBook = await epubParser.open(book.buffer)
        if (!active) return

        rendition = new ePub.Rendition(loadedBook.manifest, {
          width: '100%',
          height: '100%',
          spread: 'none',
        })
        await rendition.attachTo(element)
        if (!active) return
        renditionRef.current = rendition
        rendition.on('relocated', saveLocation)
        rendition.on('keydown', handleKeyDown)
        await rendition.display(savedPositionRef.current ?? undefined)
        if (!active) return

        setLoadState({
          bookId: book.id,
          status: 'ready',
          chapters: chaptersFrom(loadedBook.toc),
        })
      } catch (caught) {
        if (!active) return
        rendition?.destroy()
        rendition = null
        epubParser?.destroy()
        epubParser = null
        renditionRef.current = null
        setLoadState({
          bookId: book.id,
          status: 'error',
          message:
            caught instanceof Error
              ? `This file could not be opened as an EPUB: ${caught.message}`
              : 'This file could not be opened as an EPUB.',
        })
      }
    }

    void load()
    return () => {
      active = false
      renditionRef.current = null
      rendition?.destroy()
      epubParser?.destroy()
    }
  }, [book, handleKeyDown, setSavedPosition])

  useEffect(() => {
    if (!isReady) return
    renditionRef.current?.themes.register('light', {
      body: { color: '#24211d', background: '#ffffff' },
    })
    renditionRef.current?.themes.register('sepia', {
      body: { color: '#433629', background: '#f3e8d2' },
    })
    renditionRef.current?.themes.register('dark', {
      body: { color: '#e8e1d5', background: '#202124' },
    })
    renditionRef.current?.themes.select(theme)
  }, [isReady, theme])

  useEffect(() => {
    if (isReady) renditionRef.current?.themes.fontSize(`${savedFontSize.value}%`)
  }, [savedFontSize.value, isReady])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const turnPage = (direction: 'previous' | 'next') => {
    const rendition = renditionRef.current
    if (!rendition) return
    void (direction === 'previous' ? rendition.prev() : rendition.next())
  }

  const openChapter = (location: string) => {
    setShowToc(false)
    void renditionRef.current?.display(location)
  }

  return (
    <section className="reader-screen">
      <header className="reader-header">
        <button type="button" className="text-button" onClick={onClose}>
          ← Library
        </button>
        <div className="reader-title">
          <p className="eyebrow">{book.source === 'local' ? 'Local EPUB' : 'Project Gutenberg'}</p>
          <h1>{book.title}</h1>
        </div>
      </header>

      <Toolbar
        fontSize={savedFontSize.value}
        setFontSize={savedFontSize.setValue}
        theme={theme}
        setTheme={setTheme}
        onToggleToc={() => setShowToc((visible) => !visible)}
        tocOpen={showToc}
        onPrevious={() => turnPage('previous')}
        onNext={() => turnPage('next')}
        disabled={!isReady}
      />

      <div className="reader-workspace">
        {showToc && (
          <TocPanel
            chapters={chapters}
            onSelectChapter={openChapter}
            onClose={() => setShowToc(false)}
          />
        )}
        <div className="reader-content">
          {isLoading && <p className="reader-status">Opening your book…</p>}
          {errorMessage && (
            <div className="reader-error" role="alert">
              <h2>Unable to open this book</h2>
              <p>{errorMessage}</p>
              <button type="button" onClick={onClose}>Back to library</button>
            </div>
          )}
          <div
            ref={pagesElement}
            className={`reader-pages${isLoading || errorMessage ? ' reader-pages-hidden' : ''}`}
            aria-label="Book pages"
          />
        </div>
      </div>

      {savedPosition.error && (
        <p className="message storage-message" role="status">{savedPosition.error}</p>
      )}
      {savedFontSize.error && (
        <p className="message storage-message" role="status">{savedFontSize.error}</p>
      )}
      {storageError && (
        <p className="message storage-message" role="status">{storageError}</p>
      )}
    </section>
  )
}

function isFontSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 75 && value <= 200
}

export default Reader
