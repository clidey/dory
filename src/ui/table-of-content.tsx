import { useEffect, useState } from 'preact/hooks'
import docsConfig from '../../docs/dory.json' with { type: 'json' }
import type { DoryConfig } from '../types/config'
import { usePathname } from '../components/hooks'
import { TableOfContentsView } from './table-of-content-view'

const config = docsConfig as DoryConfig

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

/** Site TOC with repository actions; the embedded viewer uses the shared view directly. */
export function TableOfContents() {
  const pathname = usePathname()
  const [links, setLinks] = useState<{ edit: string | null; issue: string | null }>({ edit: null, issue: null })

  useEffect(() => {
    setLinks({ edit: editUrl(pathname), issue: issueUrl() })
  }, [pathname])

  return <TableOfContentsView pageKey={pathname} editUrl={links.edit} issueUrl={links.issue} />
}
