export type BookSource = 'local' | 'gutenberg'

export interface BookData {
  id: string
  title: string
  source: BookSource
  buffer: ArrayBuffer
  gutenbergId?: number
}

export interface RecentBook {
  id: string
  title: string
  source: BookSource
  lastOpened: string
  gutenbergId?: number
}
