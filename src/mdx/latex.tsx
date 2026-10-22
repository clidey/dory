import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useEffect, useRef, useState } from 'react'

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) return extractText((node as any).props.children);
  return '';
}

interface LatexProps {
  children: React.ReactNode
  /** Render inline with the surrounding text instead of as a display tile. */
  inline?: boolean
}

export function Latex({ children, inline = false }: LatexProps) {
  const expression = extractText(children).trim();

  if (typeof window === 'undefined') {
    return inline ? <code>{expression}</code> : <div className="my-4"><code>{expression}</code></div>
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const renderLatex = async () => {
      try {
        setError(null)
        setIsLoading(true)

        const [katexModule] = await Promise.all([
          import('katex'),
          import('katex/dist/katex.min.css'),
        ])
        const katex = katexModule.default

        if (!mounted || !containerRef.current) return

        katex.render(expression, containerRef.current, {
          displayMode: !inline,
          throwOnError: false,
        })
        setIsLoading(false)
      } catch (error) {
        if (mounted) {
          console.error('Error rendering LaTeX:', error)
          setError(error instanceof Error ? error.message : 'Failed to render LaTeX')
          setIsLoading(false)
        }
      }
    }

    renderLatex()

    return () => {
      mounted = false
    }
  }, [expression, inline])

  if (inline) {
    return <span ref={containerRef as unknown as preact.RefObject<HTMLSpanElement>} className="dory-latex-inline">{isLoading && expression}</span>
  }

  if (error) {
    return (
      <div className="my-4">
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg">
          <div className="w-16 h-16 mb-4 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-full">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            LaTeX Rendering Error
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4 max-w-md">
            The LaTeX expression could not be rendered.
          </p>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3 max-w-md">
            <p className="text-sm text-red-700 dark:text-red-300 font-mono break-all">
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dory-latex not-prose my-5 rounded-lg border border-[var(--border)] bg-muted/50 px-5 pb-5 pt-3">
      <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Display</span>
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary)]" />
        </div>
      )}
      <div ref={containerRef} className={isLoading ? 'hidden' : 'mt-3 text-center'} />
    </div>
  )
}
