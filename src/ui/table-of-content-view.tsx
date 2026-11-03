import { CatalogIcon } from '@clidey/ux'
import { useEffect, useState } from 'preact/hooks'
import classNames from 'classnames'

// A heading counts as current once it scrolls below the sticky top bar.
const ACTIVE_OFFSET = 120

type Heading = {
  id: string
  title: string
  level: 2 | 3
}

export type TableOfContentsLabels = {
  onThisPage?: string
  editThisPage?: string
  reportIssue?: string
  backToTop?: string
}

export type TableOfContentsViewProps = {
  pageKey: string
  editUrl?: string | null
  issueUrl?: string | null
  labels?: TableOfContentsLabels
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
}

function headingText(heading: Element): string {
  return Array.from(heading.childNodes)
    .filter(node => !(node instanceof Element && node.classList.contains('dory-anchor')))
    .map(node => node.textContent ?? '')
    .join('')
    .trim()
}

function collectHeadings(article: Element): Heading[] {
  const headings: Heading[] = []
  article.querySelectorAll('h2, h3').forEach(heading => {
    if (heading.closest('.dory-specimen') || heading.hasAttribute('data-toc-ignore')) return
    const title = headingText(heading)
    const id = heading.id || slugify(title)
    if (!id) return
    if (!heading.id) heading.id = id
    headings.push({ id, title, level: heading.tagName === 'H2' ? 2 : 3 })
  })
  return headings
}

/** The shared Dory heading rail used by the site and the app documentation viewer. */
export function TableOfContentsView({ pageKey, editUrl, issueUrl, labels }: TableOfContentsViewProps) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [currentId, setCurrentId] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const article = document.querySelector('.dory-article')
    if (!article) return
    const update = () => setHeadings(collectHeadings(article))
    update()
    // Mermaid and other components may add their headings after mount.
    const observer = new MutationObserver(update)
    observer.observe(article, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [pageKey])

  useEffect(() => {
    function onScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const ratio = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 1
      setProgress(Math.round(ratio * 100))

      let current = headings[0]?.id ?? ''
      if (ratio >= 1 && headings.length > 0) {
        current = headings[headings.length - 1].id
      } else {
        for (const heading of headings) {
          const el = document.getElementById(heading.id)
          if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET) current = heading.id
          else if (el) break
        }
      }
      setCurrentId(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [headings])

  let sectionNumber = 0

  return (
    <aside className="dory-toc hidden w-52 shrink-0 xl:block" aria-labelledby="on-this-page-title">
      {headings.length > 0 && (
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6">
          <div className="flex items-center justify-between">
            <h2 id="on-this-page-title" className="dory-toc-label">{labels?.onThisPage ?? 'On this page'}</h2>
            <span className="dory-toc-label">{progress}%</span>
          </div>
          <div className="dory-toc-track mt-2.5" aria-hidden="true">
            <div className="dory-toc-fill" style={{ width: `${progress}%` }} />
          </div>

          <ol role="list" className="dory-toc-list mt-5">
            {headings.map(heading => {
              if (heading.level === 2) sectionNumber += 1
              return (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    aria-current={heading.id === currentId ? 'location' : undefined}
                    className={classNames('dory-toc-link', {
                      active: heading.id === currentId,
                      'dory-toc-sub': heading.level === 3,
                    })}
                  >
                    {heading.level === 2 && (
                      <span className="dory-toc-number">{String(sectionNumber).padStart(2, '0')}</span>
                    )}
                    <span>{heading.title}</span>
                  </a>
                </li>
              )
            })}
          </ol>

          <div className="dory-toc-actions mt-6 space-y-2.5 border-t border-[var(--border)] pt-5">
            {editUrl && (
              <a href={editUrl} target="_blank" rel="noopener noreferrer">
                <CatalogIcon name="edit" aria-hidden="true" className="h-3.5 w-3.5" />
                {labels?.editThisPage ?? 'Edit this page'}
              </a>
            )}
            {issueUrl && (
              <a href={issueUrl} target="_blank" rel="noopener noreferrer">
                <CatalogIcon name="alert-circle" aria-hidden="true" className="h-3.5 w-3.5" />
                {labels?.reportIssue ?? 'Report an issue'}
              </a>
            )}
            <a
              href="#"
              onClick={event => {
                event.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              <CatalogIcon name="chevron-up" aria-hidden="true" className="h-3.5 w-3.5" />
              {labels?.backToTop ?? 'Back to top'}
            </a>
          </div>
        </div>
      )}
    </aside>
  )
}
