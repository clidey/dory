import { useEffect, useState } from 'preact/hooks'

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
}

interface LatexProps {
  children: React.ReactNode
  /** Render inline with the surrounding text instead of as a display tile. */
  inline?: boolean
}

type RenderResult = {
  expression: string
  inline: boolean
  html?: string
  error?: string
}

/** Only KaTeX produces markup; TeX commands cannot opt into trusted HTML or URLs. */
export function renderLatexExpression(katex: Pick<typeof import('katex').default, 'renderToString'>, expression: string, inline: boolean): string {
  return katex.renderToString(expression, {
    displayMode: !inline,
    throwOnError: false,
    trust: false,
    maxExpand: 1000,
  })
}

export function Latex({ children, inline = false }: LatexProps) {
  const expression = extractText(children).trim()
  const [result, setResult] = useState<RenderResult | null>(null)
  // A changed expression immediately shows its own fallback while it loads.
  const current = result?.expression === expression && result.inline === inline ? result : null
  const isLoading = current === null

  useEffect(() => {
    let mounted = true
    const renderLatex = async () => {
      try {
        const [katexModule] = await Promise.all([
          import('katex'),
          import('katex/dist/katex.min.css'),
        ])
        const html = renderLatexExpression(katexModule.default, expression, inline)
        if (mounted) setResult({ expression, inline, html })
      } catch {
        if (mounted) setResult({ expression, inline, error: 'The equation could not be rendered.' })
      }
    }
    renderLatex()
    return () => { mounted = false }
  }, [expression, inline])

  // Server rendering and the first browser render use the same readable fallback.
  // Keep KaTeX lazy, and let Preact own the markup instead of mutating a ref's DOM.
  if (inline) {
    return (
      <span className="dory-latex-inline" aria-busy={isLoading} title={current?.error}>
        {current?.html !== undefined
          ? <span dangerouslySetInnerHTML={{ __html: current.html }} />
          : <span data-latex-fallback>{expression}</span>}
      </span>
    )
  }

  return (
    <div className="dory-latex not-prose my-5 rounded-lg border border-[var(--border)] bg-muted/50 px-5 pb-5 pt-3" aria-busy={isLoading}>
      <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Display</span>
      {current?.html !== undefined
        ? <div className="mt-3 overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: current.html }} />
        : <span data-latex-fallback className="block overflow-x-auto px-2 py-3 text-center font-mono text-sm text-muted-foreground">{expression}</span>}
      {current?.error && <p role="alert" className="mt-2 text-center text-sm text-destructive">{current.error}</p>}
    </div>
  )
}
