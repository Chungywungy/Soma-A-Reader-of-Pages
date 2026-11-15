declare module 'epubjs/src/managers/default/index.js' {
  export default class DefaultViewManager {
    constructor(options: {
      view: unknown
      spine: unknown[]
      hooks: unknown
      settings: Record<string, unknown>
    })
  }
}

declare module 'epubjs/src/managers/views/iframe.js' {
  export default class IframeView {
    constructor(options: {
      section: unknown
      settings: Record<string, unknown>
    })
  }
}

declare module 'epubjs' {
  export interface NavigationItem {
    title: string
    href: string
    children?: NavigationItem[]
  }

  export interface Book {
    manifest: Record<string, unknown>
    toc: NavigationItem[]
    renderTo(
      element: HTMLElement,
      options: {
        width: string
        height: string
        spread: 'none'
        manager?: new (...args: never[]) => object
        view?: new (...args: never[]) => object
      },
    ): Rendition
    _destroy(): void
    destroy(): void
  }

  export interface Rendition {
    destroy(): void
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

  export default function ePub(
    bookData: ArrayBuffer,
    options: Record<string, unknown>,
  ): Promise<Book>
}
