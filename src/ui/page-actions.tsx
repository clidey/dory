import { useCallback } from 'preact/hooks'

import { CatalogIcon, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@clidey/ux'
import { useNotification } from '../components/notification'
import { withBase } from '../utils/base-path'

const prompt = (pathname: string) => `Please read and analyze the content from this documentation page: ${window.location.origin}${withBase(pathname)}.mdx\n\n` +
  `Then, help me understand and answer any questions I have about it. ` +
  `Please provide clear, detailed explanations and examples where relevant.`

/** The page action controls shared by built sites and sandboxed docs. */
export function PageActionsView({ onCopy, onOpenMDX, onOpenChatGPT, onOpenClaude }: {
  onCopy: () => void;
  onOpenMDX?: () => void;
  onOpenChatGPT: () => void;
  onOpenClaude: () => void;
}) {
  const items = [
    ...(onOpenMDX ? [{ label: 'Open MDX', action: onOpenMDX }] : []),
    { label: 'Open in ChatGPT', action: onOpenChatGPT },
    { label: 'Open in Claude', action: onOpenClaude },
  ]
  return (
    <div className="dory-page-actions">
      <button type="button" onClick={onCopy}>
        <CatalogIcon name="copy" aria-hidden="true" className="h-3.5 w-3.5" />
        Copy page
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger className="dory-page-actions-ai">
          <CatalogIcon name="ai" aria-hidden="true" className="h-3.5 w-3.5 text-[var(--primary)]" />
          AI actions
          <CatalogIcon name="chevron-down" aria-hidden="true" className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {items.map((item) => (
            <DropdownMenuItem key={item.label} className="cursor-pointer" onClick={item.action}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** "Copy page" and "AI actions" connected to a built Dory site's raw MDX URLs. */
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
  return <PageActionsView
    onCopy={handleCopyMDX}
    onOpenMDX={() => window.open(`${window.location.origin}${withBase(pathname)}.mdx`, '_blank')}
    onOpenChatGPT={() => window.open(`https://chat.openai.com/?q=${encodeURIComponent(prompt(pathname))}`, '_blank')}
    onOpenClaude={() => window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt(pathname))}`, '_blank')}
  />
}
