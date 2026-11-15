import type { CatalogResult } from '../types/catalogResult'

interface GutendexBook {
  id: number
  title: string
  authors: Array<{ name: string }>
  formats: Record<string, string>
}

interface GutendexResponse {
  results: GutendexBook[]
}

interface LoadedCatalogBook {
  id: number
  title: string
  buffer: ArrayBuffer
}

const GUTENDEX_URL = 'https://gutendex.com/books/'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseBook(value: unknown): GutendexBook | null {
  if (!isRecord(value)) return null
  const { id, title, authors, formats } = value
  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    typeof title !== 'string' ||
    !Array.isArray(authors) ||
    !isRecord(formats)
  ) {
    return null
  }

  const validAuthors = authors.flatMap((author) =>
    isRecord(author) && typeof author.name === 'string'
      ? [{ name: author.name }]
      : [],
  )
  const validFormats: Record<string, string> = {}
  for (const [format, url] of Object.entries(formats)) {
    if (typeof url === 'string') validFormats[format] = url
  }
  return { id, title, authors: validAuthors, formats: validFormats }
}

function parseResponse(value: unknown): GutendexResponse {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error('The catalog returned an unexpected response.')
  }
  return { results: value.results.flatMap((book) => {
    const parsed = parseBook(book)
    return parsed ? [parsed] : []
  }) }
}

function catalogResult(book: GutendexBook): CatalogResult | null {
  const title = book.title.trim()
  const sourceUrl = book.formats['application/epub+zip']
  const author = book.authors.map(({ name }) => name.trim()).find(Boolean) ?? 'Unknown author'
  if (!title || !sourceUrl) return null

  try {
    const url = new URL(sourceUrl)
    if (
      url.protocol !== 'https:' ||
      (url.hostname !== 'gutenberg.org' && !url.hostname.endsWith('.gutenberg.org'))
    ) {
      return null
    }
    return {
      id: book.id,
      title,
      author,
      epubUrl: `/api/gutenberg${url.pathname}${url.search}`,
    }
  } catch {
    return null
  }
}

async function getCatalogBook(id: number, signal?: AbortSignal): Promise<GutendexBook> {
  const response = await fetch(`${GUTENDEX_URL}${id}/`, { signal })
  if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`)
  const value: unknown = await response.json()
  const book = parseBook(value)
  if (!book) throw new Error('The catalog returned invalid book details.')
  return book
}

export async function searchCatalog(
  search: string,
  signal?: AbortSignal,
): Promise<CatalogResult[]> {
  const url = new URL(GUTENDEX_URL)
  url.searchParams.set('search', search.trim())

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Catalog search failed (${response.status}).`)
  const value: unknown = await response.json()
  return parseResponse(value).results
    .map(catalogResult)
    .filter((book): book is CatalogResult => book !== null)
    .slice(0, 12)
}

export async function fetchEpub(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) throw new Error(`EPUB download failed (${response.status}).`)
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength === 0) throw new Error('The downloaded EPUB file is empty.')
  return buffer
}

export async function fetchBookById(id: number): Promise<LoadedCatalogBook> {
  const book = await getCatalogBook(id)
  const result = catalogResult(book)
  if (!result) throw new Error('This catalog book does not have a downloadable EPUB.')
  return { id: book.id, title: result.title, buffer: await fetchEpub(result.epubUrl) }
}
