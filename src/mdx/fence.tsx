import { Suspense, useContext } from 'preact/compat'
import { Highlight, type PrismTheme } from 'prism-react-renderer'
import { CodeBody, CodeFrame, CodeGroupContext, FenceHeader, fencePropsOfCode } from './code'
import { diffBaseLanguage, isTerminalSession, parseFenceMeta, type FenceMeta } from './fence-meta'
import { MermaidRenderer } from './mermaid'
import { Loading } from '../components/loading'
import classNames from 'classnames'

// Colors resolve through CSS variables so one theme serves both light and dark mode.
const codeTheme: PrismTheme = {
  plain: { color: 'var(--foreground)', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: 'var(--muted-foreground)', fontStyle: 'italic' } },
    { types: ['keyword', 'builtin', 'function', 'tag', 'selector', 'number', 'boolean', 'constant', 'property', 'class-name'], style: { color: 'var(--primary)' } },
    { types: ['string', 'char', 'attr-value', 'url', 'regex', 'inserted'], style: { color: 'var(--dory-code-string)' } },
    { types: ['deleted'], style: { color: 'var(--destructive)' } },
    { types: ['punctuation', 'operator'], style: { color: 'var(--foreground)' } },
  ],
}

export function dedent(code: string): string {
  const lines = code.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
  const indents = lines.filter(l => l.trim().length > 0).map(l => l.match(/^(\s*)/)?.[1].length ?? 0);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
  if (minIndent === 0) return lines.join('\n');
  return lines.map(l => l.slice(minIndent)).join('\n');
}

function Line({
  number,
  marker,
  highlighted,
  children,
}: {
  number?: number
  marker?: '+' | '-' | ' '
  highlighted?: boolean
  children: preact.ComponentChildren
}) {
  return (
    <span className={classNames('dory-line', {
      'dory-line-highlight': highlighted,
      'dory-line-add': marker === '+',
      'dory-line-del': marker === '-',
    })}>
      {number !== undefined && <span className="dory-line-number" aria-hidden="true">{number}</span>}
      {marker !== undefined && <span className="dory-line-marker" aria-hidden="true">{marker === ' ' ? '' : marker}</span>}
      {children}
      {'\n'}
    </span>
  )
}

function TerminalLines({ code }: { code: string }) {
  return (
    <>
      {code.split('\n').map((line, index) => {
        if (!line.startsWith('$ ')) {
          return <Line key={index}><span className="text-muted-foreground">{line}</span></Line>
        }
        const [command, ...args] = line.slice(2).split(' ')
        return (
          <Line key={index}>
            <span className="select-none text-muted-foreground">$ </span>
            <span className="text-[var(--primary)]">{command}</span>
            {args.length > 0 && ` ${args.join(' ')}`}
          </Line>
        )
      })}
    </>
  )
}

function HighlightedLines({
  code,
  language,
  lineNumbers,
  highlight,
  markers,
}: {
  code: string
  language: string
  lineNumbers: boolean
  highlight: Set<number>
  markers?: Array<'+' | '-' | ' '>
}) {
  return (
    <Highlight code={code} language={language} theme={codeTheme}>
      {({ tokens, getTokenProps }) => (
        <>
          {tokens.map((line, index) => (
            <Line
              key={index}
              number={lineNumbers ? index + 1 : undefined}
              marker={markers?.[index]}
              highlighted={highlight.has(index + 1)}
            >
              {line
                .filter((token) => !token.empty)
                .map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
            </Line>
          ))}
        </>
      )}
    </Highlight>
  )
}

/**
 * Renders a code fence. Diffs (`diff`, `diff-<lang>`) get per-line add/remove
 * markers, shell fences with `$ ` prompts render as a terminal session, and
 * fences with a filename or `{lines}` get line numbers and highlighted lines.
 */
export function Fence({
  children,
  language,
  meta = parseFenceMeta(),
}: {
  children: string
  language: string
  meta?: FenceMeta
}) {
  if (language === 'mermaid') {
    return (
      <div className="mermaid-container">
        <Suspense fallback={<Loading />}>
          <MermaidRenderer content={children} />
        </Suspense>
      </div>
    )
  }

  const code = dedent(children)
  const diffLanguage = diffBaseLanguage(language)

  let body: preact.ComponentChildren
  if (diffLanguage !== null) {
    const lines = code.split('\n')
    const markers = lines.map((line) => (line[0] === '+' || line[0] === '-' ? line[0] : ' '))
    body = (
      <HighlightedLines
        code={lines.map((line) => line.slice(1)).join('\n')}
        language={diffLanguage}
        lineNumbers={false}
        highlight={meta.highlight}
        markers={markers}
      />
    )
  } else if (isTerminalSession(language, code)) {
    body = <TerminalLines code={code} />
  } else {
    body = (
      <HighlightedLines
        code={code}
        language={language}
        lineNumbers={Boolean(meta.title) || meta.highlight.size > 0}
        highlight={meta.highlight}
      />
    )
  }

  return (
    <pre className="whitespace-pre-wrap">
      <code className={`language-${language}`}>{body}</code>
    </pre>
  )
}

export function Pre(props: { children: preact.JSX.Element }) {
  const fence = fencePropsOfCode(props.children)
  const isInCodeGroup = useContext(CodeGroupContext);

  const rendered = <Fence language={fence.language} meta={fence.meta}>{fence.code}</Fence>

  if (isInCodeGroup || fence.language === 'mermaid') {
    return rendered
  }

  return (
    <CodeFrame code={fence.code} header={<FenceHeader {...fence} />}>
      <CodeBody>{rendered}</CodeBody>
    </CodeFrame>
  )
}
