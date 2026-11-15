declare module 'epubjs' {
  export interface NavigationItem {
    title: string
    href: string
    children?: NavigationItem[]
  }

  export interface Book {
    toc: NavigationItem[]
    renderTo(
      element: HTMLElement,
      options: {
        width: string
        height: string
        spread: 'none'
      },
    ): Rendition
    destroy(): void
  }

  export interface Rendition {
    display(target?: string): Promise<unknown>
    prev(): Promise<unknown>
    next(): Promise<unknown>
    on(event: 'relocated', callback: (location: { start: { cfi: string } }) => void): void
    on(event: 'keydown', callback: (event: KeyboardEvent) => void): void
    themes: {
      register(name: string, rules: { body: { color: string; background: string } }): void
      select(name: string): void
      fontSize(size: string): void
    }
  }

  export default function ePub(bookData: ArrayBuffer): Promise<Book>
}
