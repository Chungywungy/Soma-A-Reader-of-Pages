import { useCallback, useEffect, useRef, useState } from 'react'
import ePub, { type Book as EpubBook, type Rendition } from 'epubjs'
import DefaultViewManager from 'epubjs/src/managers/default/index.js'
import IframeView from 'epubjs/src/managers/views/iframe.js'
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

function destroyBook(book: EpubBook, rendition: Rendition | null): void {
  if (!rendition) {
    book._destroy()
    return
  }

  const orientationChange = rendition.manager.stage.orientationChangeFunc
  if (orientationChange) {
    window.removeEventListener('orientationchange', orientationChange)
  }

  const wrappedDestroy = book.destroy
  book.destroy = book._destroy
  wrappedDestroy()
}

type EpubWindow = Window & { ePub?: typeof ePub }

function Reader({ book, theme, setTheme, onClose, storageError }: ReaderProps) {
  const pagesElement = useRef<HTMLDivElement>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const [showToc, setShowToc] = useState(false)
  const savedFontSize = useStoredValue('reader-font-size', 100, isFontSize)
  const savedPosition = useSavedPosition(book.id)
  const setSavedPosition = savedPosition.setValue
  const savedPositionRef = useRef(savedPosition.value)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const swipedAtRef = useRef(0)
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

  const turnPage = useCallback((direction: 'previous' | 'next') => {
    const rendition = renditionRef.current
    if (!rendition) return
    void (direction === 'previous' ? rendition.prev() : rendition.next())
  }, [])

  const handlePageClick = useCallback(
    (event: MouseEvent, contents: { window: Window }) => {
      if (Date.now() - swipedAtRef.current < 400) return
      const target = event.target as { closest?: (selector: string) => Element | null } | null
      if (target?.closest?.('a, button, input, select, textarea, [role="button"]')) return

      const position = event.clientX / contents.window.innerWidth
      if (position <= 0.25) turnPage('previous')
      else if (position >= 0.75) turnPage('next')
    },
    [turnPage],
  )

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (event.touches.length !== 1) {
      touchStartRef.current = null
      return
    }

    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      const start = touchStartRef.current
      touchStartRef.current = null
      if (!start || event.changedTouches.length !== 1) return

      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y
      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return

      swipedAtRef.current = Date.now()
      turnPage(deltaX < 0 ? 'next' : 'previous')
    },
    [turnPage],
  )

  useEffect(() => {
    const element = pagesElement.current
    if (!element) return

    let active = true
    let loadedBook: EpubBook | null = null
    let rendition: Rendition | null = null

    const saveLocation = (location: { start: { cfi: string } }) => {
      setSavedPosition(location.start.cfi)
    }

    const load = async () => {
      try {
        const epubWindow = window as EpubWindow
        epubWindow.ePub = ePub
        loadedBook = await ePub(book.buffer, {})
        if (!active) {
          destroyBook(loadedBook, null)
          return
        }

        rendition = loadedBook.renderTo(element, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'scrolled-doc',
          manager: DefaultViewManager,
          view: IframeView,
        })
        renditionRef.current = rendition
        rendition.on('relocated', saveLocation)
        rendition.on('keydown', handleKeyDown)
        rendition.on('click', handlePageClick)
        rendition.on('touchstart', handleTouchStart)
        rendition.on('touchend', handleTouchEnd)
        await rendition.display(savedPositionRef.current ?? undefined)
        if (!active) return

        setLoadState({
          bookId: book.id,
          status: 'ready',
          chapters: chaptersFrom(loadedBook.toc),
        })
      } catch (caught) {
        if (!active) return
        if (loadedBook) destroyBook(loadedBook, rendition)
        rendition = null
        loadedBook = null
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
      if (loadedBook) destroyBook(loadedBook, rendition)
    }
  }, [
    book,
    handleKeyDown,
    handlePageClick,
    handleTouchEnd,
    handleTouchStart,
    setSavedPosition,
  ])

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
