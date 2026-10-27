import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { ClipboardIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import {
  Children,
  createContext,
  isValidElement,
  useEffect,
  useState
} from 'react'
import { File, SquareTerminal } from 'lucide-react'
import { Tag } from './tag'
import { diffBaseLanguage, isTerminalSession, parseFenceMeta, type FenceMeta } from './fence-meta'
import { toTitleCase } from '../utils/functions'
import { Button } from '@clidey/ux'
import { CheckIcon } from 'lucide-react'

export const supportedLanguages = {
  'python': 'Python',
  'py': 'Python',
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'java': 'Java',
  'c': 'C',
  'cpp': 'C++',
  'csharp': 'C#',
  'cs': 'C#',
  'rust': 'Rust',
  'go': 'Go',
  'ruby': 'Ruby',
  'php': 'PHP',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'scala': 'Scala',
  'haskell': 'Haskell',
  'erlang': 'Erlang',
  'elixir': 'Elixir',
  'markdown': 'Markdown',
  'md': 'Markdown',
  'html': 'HTML',
  'css': 'CSS',
  'json': 'JSON',
  'yaml': 'YAML',
  'yml': 'YAML',
  'toml': 'TOML',
  'bash': 'Bash',
  'markup': 'Markup',
  'xml': 'XML',
  'jsx': 'JSX',
  'tsx': 'TSX',
  'objectivec': 'Objective-C',
  'js-extras': 'JavaScript Extras',
  'reason': 'Reason',
  'graphql': 'GraphQL',
  'mdx': 'MDX',
  'sh': 'Shell',
  'sql': 'SQL',
}

/** Language, raw code and parsed meta for a fenced code block (an MDX `pre` element). */
export interface FenceProps {
  language: string
  code: string
  meta: FenceMeta
}

/** Reads the fence a `pre` element wraps: `<pre><code className="language-x" metastring="...">`. */
export function fencePropsOf(pre: preact.JSX.Element | undefined): FenceProps {
  return fencePropsOfCode(pre?.props?.children)
}

/** Reads a fence from its `code` element. */
export function fencePropsOfCode(code: preact.JSX.Element | undefined): FenceProps {
  const codeProps = code?.props ?? {}
  const className = typeof codeProps.className === 'string' ? codeProps.className : ''
  return {
    language: className.replace('language-', ''),
    code: typeof codeProps.children === 'string' ? codeProps.children : '',
    meta: parseFenceMeta(codeProps.metastring),
  }
}

function languageName(language: string) {
  if (!language) return 'Code'
  return supportedLanguages[language as keyof typeof supportedLanguages] || toTitleCase(language)
}

export function CopyButton({ code }: { code: string }) {
  const [copyCount, setCopyCount] = useState(0)
  const copied = copyCount > 0

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopyCount(0), 1000)
      return () => clearTimeout(timeout)
    }
  }, [copied])

  return (
    <Button
      aria-label="Copy code"
      className={classNames(
        'group/button absolute top-1.5 right-2 z-10 overflow-hidden rounded-md p-1.5 shadow-none transition',
        {
          'bg-[var(--success-muted)]': copied,
          'bg-transparent hover:bg-card': !copied,
        }
      )}
      onClick={() => {
        window.navigator.clipboard.writeText(code).then(() => {
          setCopyCount((count) => count + 1)
        })
      }}
    >
      <span
        aria-hidden={copied}
        className={classNames(
          'pointer-events-none flex items-center gap-0.5 text-muted-foreground transition duration-300 text-sm',
          copied && '-translate-y-1.5 opacity-0',
        )}
      >
        <ClipboardIcon className="h-3.5 w-3.5 stroke-muted-foreground transition-colors group-hover/button:stroke-foreground" />
      </span>
      <span
        aria-hidden={!copied}
        className={classNames(
          'pointer-events-none absolute inset-0 flex items-center justify-center text-foreground transition duration-300 text-sm',
          !copied && 'translate-y-1.5 opacity-0',
        )}
      >
        <CheckIcon className="h-3.5 w-3.5" />
      </span>
    </Button>
  )
}

/** Small mono pill used in code headers, e.g. JSON, SH, DIFF. */
function LanguagePill({ children }: { children: string }) {
  return (
    <span className="rounded-[5px] border border-[var(--border)] bg-card px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  )
}

/**
 * Header bar for a standalone fence: icon + filename (or language) on the
 * left; diff stats and a language pill on the right.
 */
export function FenceHeader({ language, code, meta }: FenceProps) {
  const diff = diffBaseLanguage(language) !== null
  const terminal = isTerminalSession(language, code)
  const title = meta.title ?? (terminal ? 'Terminal' : languageName(language))
  const showPill = Boolean(meta.title) || terminal || diff
  const lines = code.split('\n')
  const additions = diff ? lines.filter((line) => line.startsWith('+')).length : 0
  const deletions = diff ? lines.filter((line) => line.startsWith('-')).length : 0

  return (
    <div className="flex min-h-10 items-center gap-2 border-b border-[var(--border)] bg-muted pl-4 pr-12">
      {terminal
        ? <SquareTerminal aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        : meta.title && <File aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      <p className="mr-auto truncate font-mono text-xs font-medium text-foreground">{title}</p>
      {diff && (
        <span className="font-mono text-xs">
          <span className="text-green-700 dark:text-green-400">+{additions}</span>{' '}
          <span className="text-[var(--destructive)]">-{deletions}</span>
        </span>
      )}
      {showPill && <LanguagePill>{diff ? 'diff' : language}</LanguagePill>}
    </div>
  )
}

/** Rounded frame shared by standalone fences and code groups. The copy button sits in the header row. */
export function CodeFrame({ header, code, children }: { header?: preact.ComponentChildren; code: string; children: preact.ComponentChildren }) {
  return (
    <div className="dory-code not-prose relative my-5 overflow-hidden rounded-lg border border-[var(--border)] bg-card">
      {header}
      <CopyButton code={code} />
      {children}
    </div>
  )
}

/** Padded, horizontally scrollable code area inside a CodeFrame. */
export function CodeBody({ children }: { children: preact.ComponentChildren }) {
  return <div className="overflow-x-auto bg-card py-3 pl-4 pr-12 font-mono text-[12.5px] leading-[1.7]">{children}</div>
}

function CodePanelHeader({ tag, label }: { tag?: string; label?: string }) {
  if (!tag && !label) return null

  return (
    <div className="flex h-9 items-center gap-2 border-b border-[var(--border)] bg-card px-4">
      {tag && <Tag variant="small">{tag}</Tag>}
      {label && <span className="font-mono text-xs text-muted-foreground">{label}</span>}
    </div>
  )
}

function CodeGroupHeader({
  title,
  children,
  selectedIndex,
}: {
  title: string
  children: preact.ComponentChildren
  selectedIndex: number
}) {
  const hasTabs = Children.count(children) > 1

  if (!title && !hasTabs) return null

  return (
    <div className="flex min-h-10 flex-wrap items-end gap-x-4 border-b border-[var(--border)] bg-muted pl-4 pr-12">
      {title && (
        <p className="mr-auto self-center py-2.5 font-mono text-xs font-medium text-foreground">
          {title}
        </p>
      )}
      {hasTabs && (
        <TabList className="-mb-px flex gap-4 text-xs font-medium">
          {Children.map(children, (child, index) => {
            if (!isValidElement(child)) return null
            const fence = fencePropsOf(child as preact.JSX.Element)

            return (
              <Tab
                key={index}
                className={classNames(
                  'border-b-2 pb-2.5 pt-3 transition data-selected:not-data-focus:outline-hidden',
                  index === selectedIndex
                    ? 'border-[var(--primary)] text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {fence.meta.title ?? languageName(fence.language)}
              </Tab>
            )
          })}
        </TabList>
      )}
    </div>
  )
}

export const CodeGroupContext = createContext(false)

/**
 * Groups fences into one frame. Several fences become tabs labelled by each
 * fence's title (e.g. ```bash cURL) or language; `tag`/`label` meta adds a
 * method badge row.
 */
export function CodeGroup({
  children,
  title,
}: {
  children: preact.ComponentChildren
  title: string
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const childrenArray = Children.toArray(children) as preact.JSX.Element[]
  const hasTabs = childrenArray.length > 1
  const selected = fencePropsOf(childrenArray[hasTabs ? selectedIndex : 0])

  const header = (
    <CodeGroupHeader title={title} selectedIndex={selectedIndex}>
      {children}
    </CodeGroupHeader>
  )

  const panel = (child: preact.JSX.Element) => {
    const { meta } = fencePropsOf(child)
    return (
      <>
        <CodePanelHeader tag={meta.tag} label={meta.label} />
        <CodeBody>{child}</CodeBody>
      </>
    )
  }

  return (
    <CodeGroupContext.Provider value={true}>
      {hasTabs ? (
        <TabGroup as="div" selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <CodeFrame header={header} code={selected.code}>
            <TabPanels>
              {childrenArray.map((child, index) => (
                <TabPanel key={index}>{panel(child)}</TabPanel>
              ))}
            </TabPanels>
          </CodeFrame>
        </TabGroup>
      ) : (
        <CodeFrame header={header} code={selected.code}>
          {panel(childrenArray[0])}
        </CodeFrame>
      )}
    </CodeGroupContext.Provider>
  )
}

export function Code({
  children,
  ...props
}: React.ComponentPropsWithoutRef<'code'>) {
  const isBlock = typeof props.className === 'string' && props.className.includes('language-');
  return <code {...props} className={classNames(props.className, {
    'dory-mdx-code rounded-md border border-[var(--border)] bg-muted py-0.5 text-[0.875em] px-1.5': !isBlock,
  })}>{children}</code>
}
