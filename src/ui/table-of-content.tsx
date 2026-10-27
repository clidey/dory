import { useEffect, useState } from 'preact/hooks'
import classNames from 'classnames'
import { ChevronUp, CircleAlert, SquarePen } from 'lucide-react'
import docsConfig from '../../docs/dory.json' with { type: 'json' }
import type { DoryConfig } from '../types/config'
import { usePathname } from '../components/hooks'

const config = docsConfig as DoryConfig

// A heading counts as current once it scrolls above this offset (below the sticky top bar).
const ACTIVE_OFFSET = 120

/**
 * Slugifies heading text matching rehype-slug (github-slugger) behavior:
 * lowercase, strip punctuation, spaces to dashes. Used only as a fallback
 * for headings that did not get an id at build time, so client-assigned
 * anchors agree with SSR-assigned ones.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
}

type Heading = {
  id: string
  title: string
  level: 2 | 3
}

// Heading text without the trailing "#" anchor link
function headingText(heading: Element) {
  return Array.from(heading.childNodes)
    .filter((node) => !(node instanceof Element && node.classList.contains('dory-anchor')))
    .map((node) => node.textContent ?? '')
    .join('')
    .trim()
}

// Article h2/h3 headings, skipping the ones rendered inside component specimens.
function collectHeadings(article: Element): Heading[] {
  const headings: Heading[] = []
  article.querySelectorAll('h2, h3').forEach((heading) => {
    if (heading.closest('.dory-specimen')) return
    const title = headingText(heading)
    const id = heading.id || slugify(title)
    if (!id) return
    if (!heading.id) heading.id = id
    headings.push({ id, title, level: heading.tagName === 'H2' ? 2 : 3 })
  })
  return headings
}

function editUrl(pathname: string) {
  const repo = config.repository
  if (!repo) return null
  const dir = repo.path ? `${repo.path.replace(/\/$/, '')}/` : ''
  return `${repo.url}/edit/${repo.branch ?? 'main'}/${dir}${pathname.replace(/^\//, '')}.mdx`
}

function issueUrl() {
  const repo = config.repository
  if (!repo) return null
  const title = encodeURIComponent(`Docs: ${document.title}`)
  const body = encodeURIComponent(`Page: ${window.location.origin}${window.location.pathname}`)
  return `${repo.url}/issues/new?title=${title}&body=${body}`
}

/**
 * "On this page" rail: reading progress, numbered h2 sections (h3s nested),
 * and edit / report / back-to-top links. The aside always renders so the SSR
 * shell matches; its contents fill in once the article headings are read.
 */
export function TableOfContents() {
  const pathname = usePathname()
  const [headings, setHeadings] = useState<Heading[]>([])
  const [currentId, setCurrentId] = useState('')
  const [progress, setProgress] = useState(0)
  const [links, setLinks] = useState<{ edit: string | null; issue: string | null }>({ edit: null, issue: null })

  useEffect(() => {
    const article = document.querySelector('.dory-article')
    if (!article) return
    const update = () => setHeadings(collectHeadings(article))
    update()
    // Specimens, Mermaid and API pages render after mount, so re-read on change.
    const observer = new MutationObserver(update)
    observer.observe(article, { childList: true, subtree: true })
    setLinks({ edit: editUrl(pathname), issue: issueUrl() })
    return () => observer.disconnect()
  }, [pathname])

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
            <h2 id="on-this-page-title" className="dory-toc-label">On this page</h2>
            <span className="dory-toc-label">{progress}%</span>
          </div>
          <div className="dory-toc-track mt-2.5" aria-hidden="true">
            <div className="dory-toc-fill" style={{ width: `${progress}%` }} />
          </div>

          <ol role="list" className="dory-toc-list mt-5">
            {headings.map((heading) => {
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
            {links.edit && (
              <a href={links.edit} target="_blank" rel="noopener noreferrer">
                <SquarePen aria-hidden="true" className="h-3.5 w-3.5" />
                Edit this page
              </a>
            )}
            {links.issue && (
              <a href={links.issue} target="_blank" rel="noopener noreferrer">
                <CircleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                Report an issue
              </a>
            )}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
              Back to top
            </a>
          </div>
        </div>
      )}
    </aside>
  )
}
