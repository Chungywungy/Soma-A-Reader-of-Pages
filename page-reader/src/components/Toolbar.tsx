import type { Dispatch, SetStateAction } from 'react'
import { isTheme, type Theme } from '../types/theme'

interface ToolbarProps {
  fontSize: number
  setFontSize: Dispatch<SetStateAction<number>>
  theme: Theme
  setTheme: (theme: Theme) => void
  onToggleToc: () => void
  tocOpen: boolean
  onPrevious: () => void
  onNext: () => void
  disabled: boolean
}

function Toolbar({
  fontSize,
  setFontSize,
  theme,
  setTheme,
  onToggleToc,
  tocOpen,
  onPrevious,
  onNext,
  disabled,
}: ToolbarProps) {
  return (
    <nav className="toolbar" aria-label="Reader controls">
      <div className="toolbar-group page-controls">
        <button type="button" onClick={onPrevious} disabled={disabled} aria-label="Previous page">
          Previous
        </button>
        <button type="button" onClick={onNext} disabled={disabled} aria-label="Next page">
          Next
        </button>
      </div>
      <div className="toolbar-group">
        <button
          type="button"
          onClick={onToggleToc}
          aria-expanded={tocOpen}
          aria-controls="table-of-contents"
          disabled={disabled}
        >
          {tocOpen ? 'Hide contents' : 'Contents'}
        </button>
        <label className="control-label">
          Theme
          <select
            value={theme}
            onChange={(event) => {
              const nextTheme = event.currentTarget.value
              if (isTheme(nextTheme)) setTheme(nextTheme)
            }}
            aria-label="Reading theme"
          >
            <option value="light">Light</option>
            <option value="sepia">Sepia</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <div className="font-controls" aria-label="Font size">
          <button
            type="button"
            onClick={() => setFontSize((size) => Math.max(75, size - 10))}
            disabled={fontSize <= 75}
            aria-label="Decrease font size"
          >
            A−
          </button>
          <span>{fontSize}%</span>
          <button
            type="button"
            onClick={() => setFontSize((size) => Math.min(200, size + 10))}
            disabled={fontSize >= 200}
            aria-label="Increase font size"
          >
            A+
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Toolbar
