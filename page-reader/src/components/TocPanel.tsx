import type { Chapter } from '../types/chapter'

interface TocPanelProps {
  chapters: Chapter[]
  onSelectChapter: (location: string) => void
  onClose: () => void
}

function TocPanel({ chapters, onSelectChapter, onClose }: TocPanelProps) {
  return (
    <aside className="toc-panel" id="table-of-contents" aria-label="Table of contents">
      <div className="toc-heading">
        <h2>Contents</h2>
        <button type="button" className="text-button" onClick={onClose} aria-label="Close contents">
          Close
        </button>
      </div>
      {chapters.length > 0 ? (
        <ol>
          {chapters.map((chapter) => (
            <li key={chapter.location}>
              <button
                type="button"
                className="chapter-link"
                onClick={() => onSelectChapter(chapter.location)}
              >
                {chapter.label}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">This book does not include a table of contents.</p>
      )}
    </aside>
  )
}

export default TocPanel
