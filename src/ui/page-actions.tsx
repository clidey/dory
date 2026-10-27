import { useCallback } from 'preact/hooks'
import { ChevronDown, Copy, Sparkles } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@clidey/ux'
import { useNotification } from '../components/notification'
import { withBase } from '../utils/base-path'

const prompt = (pathname: string) => `Please read and analyze the content from this documentation page: ${window.location.origin}${withBase(pathname)}.mdx\n\n` +
  `Then, help me understand and answer any questions I have about it. ` +
  `Please provide clear, detailed explanations and examples where relevant.`

/** "Copy page" and "AI actions" button pair beside the breadcrumb. */
export function PageActions({ pathname }: { pathname: string }) {
  const { showNotification } = useNotification()

  const handleCopyMDX = useCallback(async () => {
    try {
      const response = await fetch(`${withBase(pathname)}.mdx`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await navigator.clipboard.writeText(await response.text())
      showNotification('Copied to clipboard')
    } catch (error) {
      console.warn(`Failed to fetch ${pathname}.mdx:`, error)
      showNotification('Could not copy MDX', 'The raw MDX file is not available.')
    }
  }, [pathname, showNotification])

  const items = [
    { label: 'Open MDX', url: () => `${window.location.origin}${withBase(pathname)}.mdx` },
    { label: 'Open in ChatGPT', url: () => `https://chat.openai.com/?q=${encodeURIComponent(prompt(pathname))}` },
    { label: 'Open in Claude', url: () => `https://claude.ai/new?q=${encodeURIComponent(prompt(pathname))}` },
  ]

  return (
    <div className="dory-page-actions">
      <button type="button" onClick={handleCopyMDX}>
        <Copy aria-hidden="true" className="h-3.5 w-3.5" />
        Copy page
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger className="dory-page-actions-ai">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[var(--primary)]" />
          AI actions
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {items.map((item) => (
            <DropdownMenuItem key={item.label} className="cursor-pointer" onClick={() => window.open(item.url(), '_blank')}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
