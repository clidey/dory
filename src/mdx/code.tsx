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
import { Tag } from './tag'
import { toTitleCase } from '../utils/functions'
import { Button, Card } from '@clidey/ux'
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
}

function getPanelTitle(props: { className?: string }) {
  const { className } = props
  if (className) {
    const language = className.replace('language-', '') as keyof typeof supportedLanguages;
    return supportedLanguages[language] || toTitleCase(language)
  }
  return 'Code'
}

function CopyButton({ code }: { code: string }) {
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
      className={classNames(
        'group/button absolute top-1 right-2 overflow-hidden rounded-full py-1 pr-3 pl-2 text-2xs font-medium opacity-0 backdrop-blur-sm transition group-hover:opacity-100 focus:opacity-100',
        {
          'bg-emerald-400/10 ring-1 ring-emerald-400/20 ring-inset': copied,
          'bg-white/5 hover:bg-white/7.5 dark:bg-white/2.5 dark:hover:bg-white/5': !copied,
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
          'pointer-events-none flex items-center gap-0.5 text-zinc-400 transition duration-300 text-sm',
          copied && '-translate-y-1.5 opacity-0',
        )}
      >
        <ClipboardIcon className="h-4 w-4 fill-zinc-500/20 stroke-zinc-500 transition-colors group-hover/button:stroke-zinc-400" />
      </span>
      <span
        aria-hidden={!copied}
        className={classNames(
          'pointer-events-none absolute inset-0 flex items-center justify-center text-emerald-400 transition duration-300 text-sm',
          !copied && 'translate-y-1.5 opacity-0',
        )}
      >
        <CheckIcon className="h-4 w-4" />
      </span>
    </Button>
  )
}

function CodePanelHeader({ tag, label }: { tag?: string; label?: string }) {
  if (!tag && !label) return null

  return (
    <div className="flex h-9 items-center gap-2 border-y border-t-transparent border-b-white/7.5 bg-white/2.5 px-4 dark:border-b-white/5 dark:bg-white/1">
      {tag && (
        <div className="dark flex">
          <Tag variant="small">{tag}</Tag>
        </div>
      )}
      {tag && label && <span className="h-0.5 w-0.5 rounded-full bg-zinc-500" />}
      {label && <span className="font-mono text-xs text-zinc-400">{label}</span>}
    </div>
  )
}

function CodePanel({
  children,
  tag,
  label,
  code,
}: {
  children: React.ReactNode
  tag?: string
  label?: string
  code?: string
}) {
  const child = Children.only(children)

  if (isValidElement(child)) {
    // @ts-expect-error
    tag = child.props.tag ?? tag
    // @ts-expect-error
    label = child.props.label ?? label
    // @ts-expect-error
    code = child.props.code ?? code
  }

  if (!code) {
    // @ts-expect-error
    code = child.props.children
  }

  return (
    <div className="group dark:bg-white/2.5">
      <CodePanelHeader tag={tag} label={label} />
      <div className="relative">
        <pre className="overflow-x-auto p-4 text-xs">{children}</pre>
        <CopyButton code={code ?? ''} />
      </div>
    </div>
  )
}

function CodeGroupHeader({
  title,
  children,
  selectedIndex,
}: {
  title: string
  children: React.ReactNode
  selectedIndex: number
}) {
  const hasTabs = Children.count(children) > 1

  if (!title && !hasTabs) return null

  return (
    <div className="flex flex-wrap items-start gap-x-4 px-4 pb-2">
      {title && (
        <p className="mr-auto pt-3 text-xs font-semibold">
          {title}
        </p>
      )}
      {hasTabs && (
        <TabList className="-mb-px flex gap-4 text-xs font-medium">
          {Children.map(children, (child, index) => {
            if (!isValidElement(child)) return null

            const childProps = (child as preact.JSX.Element).props?.children?.props ?? {}
            const panelTitle = getPanelTitle(childProps)

            return (
              <Tab
                key={index}
                className={classNames(
                  'pt-2 transition data-selected:not-data-focus:outline-hidden',
                  index === selectedIndex
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300',
                )}
              >
                {panelTitle}
              </Tab>
            )
          })}
        </TabList>
      )}
    </div>
  )
}

function CodeGroupPanels({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof CodePanel>) {
  const hasTabs = Children.count(children) > 1

  if (hasTabs) {
    return (
      <TabPanels>
        {Children.map(children, (child, index) => (
          <TabPanel key={index}>
            <CodePanel {...props}>{child}</CodePanel>
          </TabPanel>
        ))}
      </TabPanels>
    )
  }

  return <CodePanel {...props}>{children}</CodePanel>
}

export const CodeGroupContext = createContext(false)

export function CodeGroup({
  children,
  title,
  ...props
}: React.ComponentPropsWithoutRef<typeof CodeGroupPanels> & { title: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const childrenArray = Children.toArray(children)

  const hasTabs = childrenArray.length > 1

  const header = (
    <CodeGroupHeader title={title} selectedIndex={selectedIndex}>
      {children}
    </CodeGroupHeader>
  )
  const panels = <CodeGroupPanels {...props}>{children}</CodeGroupPanels>

  return (
    <CodeGroupContext.Provider value={true}>
      {hasTabs ? (
        <Card className="py-0 border-black/10 bg-none overflow-hidden mb-4">
          <TabGroup
            as="div"
            selectedIndex={selectedIndex}
            onChange={setSelectedIndex}
          >
            <div className="not-prose">
              {header}
              {panels}
            </div>
          </TabGroup>
        </Card>
      ) : (
        <Card className="py-0 border-black/10 bg-none overflow-hidden mb-4">
          <div className="not-prose">
            {header}
            {panels}
          </div>
        </Card>
      )}
    </CodeGroupContext.Provider>
  )
}

export function Code({
  children,
  ...props
}: React.ComponentPropsWithoutRef<'code'>) {
  return <code className={classNames('dory-mdx-code rounded-md py-1 text-sm px-2', props.className)} {...props}>{children}</code>
}
