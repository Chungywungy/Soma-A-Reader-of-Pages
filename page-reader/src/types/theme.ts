export type Theme = 'light' | 'sepia' | 'dark'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'sepia' || value === 'dark'
}