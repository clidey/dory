import { useCallback, useEffect, useState } from 'react'
import classNames from 'classnames'

export type Section = {
  id: string
  title: string
  children: Array<Subsection>
}

export type Subsection = {
  id: string
  title: string
}

export function TableOfContents() {
  const [currentSection, setCurrentSection] = useState<string>('')
  const [sections, setSections] = useState<Section[]>([])
  const [isContentLoaded, setIsContentLoaded] = useState(false)

  const collectHeadings = useCallback(() => {
    const article = document.querySelector('article')
    if (!article) return

    // Wait for content to be loaded
    const observer = new MutationObserver(() => {
      const headings = article.querySelectorAll('h2:not([style*="display: none"]), h3:not([style*="display: none"])')
      const sections: Section[] = []
      let currentSection: Section | null = null

      headings.forEach((heading) => {
        // Check if heading is visible
        const style = window.getComputedStyle(heading)
        if (style.display === 'none' || style.visibility === 'hidden') return

        const id = heading.id || heading.textContent?.toLowerCase().replace(/\s+/g, '-') || ''
        heading.id = id

        if (heading.tagName === 'H2') {
          currentSection = {
            id,
            title: heading.textContent || '',
            children: []
          }
          sections.push(currentSection)
        } else if (heading.tagName === 'H3' && currentSection) {
          currentSection.children.push({
            id,
            title: heading.textContent || ''
          })
        }
      })

      setSections(sections)
      setIsContentLoaded(true)
    })

    observer.observe(article, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const cleanup = collectHeadings()
    return () => cleanup?.()
  }, [collectHeadings])

  const getHeadings = useCallback(() => {
    return sections
      .flatMap((section) => [section.id, ...section.children.map((child) => child.id)])
      .map((id) => {
        const el = document.getElementById(id)
        if (!el) return null
        const top = window.scrollY + el.getBoundingClientRect().top
        return { id, top }
      })
      .filter((x): x is { id: string; top: number } => x !== null)
  }, [sections])

  useEffect(() => {
    if (!isContentLoaded || sections.length === 0) return
    const headings = getHeadings()
    
    function onScroll() {
      const top = window.scrollY
      let current = headings[0].id
      for (const heading of headings) {
        if (top >= heading.top - 10) {
          current = heading.id
        } else {
          break
        }
      }
      setCurrentSection(current)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [getHeadings, sections, isContentLoaded])

  function isActive(section: Section | Subsection) {
    return section.id === currentSection
  }

  if (!isContentLoaded) {
    return null
  }

  return (
    <div className="hidden xl:sticky xl:top-[4.75rem] xl:-mr-6 xl:block xl:h-[calc(100vh-4.75rem)] xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6">
      <nav aria-labelledby="on-this-page-title" className="w-56">
        {sections.length > 0 && (
          <>
            <h2
              id="on-this-page-title"
              className="font-display text-sm font-medium text-slate-900 dark:text-white"
            >
              On this page
            </h2>
            <ol role="list" className="mt-4 space-y-3 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <h3>
                    <a
                      href={`#${section.id}`}
                      className={classNames({
                        "text-sky-500": isActive(section),
                        "font-normal text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300": !isActive(section),
                      })}>
                      {section.title}
                    </a>
                  </h3>
                  {section.children.length > 0 && (
                    <ol role="list" className="mt-2 space-y-3 pl-5 text-slate-500 dark:text-slate-400">
                      {section.children.map((subSection) => (
                        <li key={subSection.id}>
                          <a
                            href={`#${subSection.id}`}
                            className={
                              isActive(subSection)
                                ? 'text-sky-500'
                                : 'hover:text-slate-600 dark:hover:text-slate-300'
                            }
                          >
                            {subSection.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </nav>
    </div>
  )
}
