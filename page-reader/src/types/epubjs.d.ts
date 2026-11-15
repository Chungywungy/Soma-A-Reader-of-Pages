declare module 'epubjs' {
  export interface NavigationItem {
    title: string
    href: string
    children?: NavigationItem[]
  }

  export interface Book {
    manifest: Record<string, unknown>
    toc: NavigationItem[]
    destroy(): void
  }

  export interface EpubParser {
    open(input: ArrayBuffer): Promise<Book>
    destroy(): void
  }

  export interface RenditionOptions {
    width: string
    height: string
    spread: 'none'
  }

  export interface Rendition {
    attachTo(element: HTMLElement): Promise<void>
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

  interface EpubFactory {
    (): Promise<EpubParser>
    Rendition: new (manifest: Record<string, unknown>, options: RenditionOptions) => Rendition
  }

  const ePub: EpubFactory
  export default ePub
}
