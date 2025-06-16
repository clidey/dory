import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import classNames from 'classnames'
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Tag } from './tag'

const languageNames: Record<string, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  php: 'PHP',
  python: 'Python',
  ruby: 'Ruby',
  go: 'Go',
}

function getPanelTitle({
  title,
  language,
}: {
  title?: string
  language?: string
}) {
  if (title) {
    return title
  }
  if (language && language in languageNames) {
    return languageNames[language]
  }
  return 'API'
}

function ClipboardIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        strokeWidth="0"
        d="M5.5 13.5v-5a2 2 0 0 1 2-2l.447-.894A2 2 0 0 1 9.737 4.5h.527a2 2 0 0 1 1.789 1.106l.447.894a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2Z"
      />
      <path
        fill="none"
        strokeLinejoin="round"
        d="M12.5 6.5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2m5 0-.447-.894a2 2 0 0 0-1.79-1.106h-.527a2 2 0 0 0-1.789 1.106L7.5 6.5m5 0-1 1h-3l-1-1"
      />
    </svg>
  )
}

function CopyButton({ code }: { code: string }) {
  const [copyCount, setCopyCount] = useState(0)
  const copied = copyCount > 0

  useEffect(() => {
    if (copyCount > 0) {
      const timeout = setTimeout(() => setCopyCount(0), 1000)
      return () => {
        clearTimeout(timeout)
      }
    }
  }, [copyCount])

  return (
    <button
      type="button"
      className={classNames(
        'group/button absolute top-3.5 right-4 overflow-hidden rounded-full py-1 pr-3 pl-2 text-2xs font-medium opacity-0 backdrop-blur-sm transition group-hover:opacity-100 focus:opacity-100',
        copied
          ? 'bg-emerald-400/10 ring-1 ring-emerald-400/20 ring-inset'
          : 'bg-white/5 hover:bg-white/7.5 dark:bg-white/2.5 dark:hover:bg-white/5',
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
          'pointer-events-none flex items-center gap-0.5 text-zinc-400 transition duration-300',
          copied && '-translate-y-1.5 opacity-0',
        )}
      >
        <ClipboardIcon className="h-5 w-5 fill-zinc-500/20 stroke-zinc-500 transition-colors group-hover/button:stroke-zinc-400" />
        Copy
      </span>
      <span
        aria-hidden={!copied}
        className={classNames(
          'pointer-events-none absolute inset-0 flex items-center justify-center text-emerald-400 transition duration-300',
          !copied && 'translate-y-1.5 opacity-0',
        )}
      >
        Copied!
      </span>
    </button>
  )
}

function APIPanelHeader({ tag, label }: { tag?: string; label?: string }) {
  if (!tag && !label) {
    return null
  }

  return (
    <div className="flex h-9 items-center gap-2 border-y border-t-transparent border-b-white/7.5 bg-zinc-900 px-4 dark:border-b-white/5 dark:bg-white/1">
      {tag && (
        <div className="dark flex">
          <Tag variant="small">{tag}</Tag>
        </div>
      )}
      {tag && label && (
        <span className="h-0.5 w-0.5 rounded-full bg-zinc-500" />
      )}
      {label && (
        <span className="font-mono text-xs text-zinc-400">{label}</span>
      )}
    </div>
  )
}

function APIPanel({
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
    // @ts-expect-error child.props is not typed
    tag = child.props.tag ?? tag
    // @ts-expect-error child.props is not typed
    label = child.props.label ?? label
    // @ts-expect-error child.props is not typed
    code = child.props.code ?? code
  }

  return (
    <div className="group dark:bg-white/2.5">
      <APIPanelHeader tag={tag} label={label} />
      <div className="relative">
        <pre className="overflow-x-auto p-4 text-xs text-white">{children}</pre>
        {/* @ts-expect-error code is not typed */}
        <CopyButton code={code} />
      </div>
    </div>
  )
}

function APIGroupHeader({
  title,
  children,
  selectedIndex,
}: {
  title: string
  children: React.ReactNode
  selectedIndex: number
}) {
  const hasTabs = Children.count(children) > 1

  if (!title && !hasTabs) {
    return null
  }

  return (
    <div className="flex min-h-[calc(--spacing(12)+1px)] flex-wrap items-start gap-x-4 border-b border-zinc-700 bg-zinc-800 px-4 dark:border-zinc-800 dark:bg-transparent">
      {title && (
        <h3 className="mr-auto pt-3 text-xs font-semibold text-white">
          {title}
        </h3>
      )}
      {hasTabs && (
        <TabList className="-mb-px flex gap-4 text-xs font-medium">
          {Children.map(children, (child, childIndex) => (
            <Tab
              className={classNames(
                'border-b py-3 transition data-selected:not-data-focus:outline-hidden',
                childIndex === selectedIndex
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300',
              )}
            >
              {/* @ts-expect-error child.props is not typed */}
              {getPanelTitle(isValidElement(child) ? child.props : {})}
            </Tab>
          ))}
        </TabList>
      )}
    </div>
  )
}

function APIGroupPanels({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof APIPanel>) {
  const hasTabs = Children.count(children) > 1

  if (hasTabs) {
    return (
      <TabPanels>
        {Children.map(children, (child) => (
          <TabPanel>
            <APIPanel {...props}>{child}</APIPanel>
          </TabPanel>
        ))}
      </TabPanels>
    )
  }

  return <APIPanel {...props}>{children}</APIPanel>
}
function usePreventLayoutShift() {
  const positionRef = useRef<HTMLElement>(null)
  const rafRef = useRef<number>()

  useEffect(() => {
    return () => {
      if (typeof rafRef.current !== 'undefined') {
        window.cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return {
    positionRef,
    preventLayoutShift(callback: () => void) {
      if (!positionRef.current) {
        return
      }

      const initialTop = positionRef.current.getBoundingClientRect().top

      callback()

      rafRef.current = window.requestAnimationFrame(() => {
        const newTop =
          positionRef.current?.getBoundingClientRect().top ?? initialTop
        window.scrollBy(0, newTop - initialTop)
      })
    },
  }
}

function useTabGroupProps(availableLanguages: Array<string>) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([])
  
  const activeLanguage = [...availableLanguages].sort(
    (a, z) => preferredLanguages.indexOf(z) - preferredLanguages.indexOf(a),
  )[0]
  const languageIndex = availableLanguages.indexOf(activeLanguage)
  const newSelectedIndex = languageIndex === -1 ? selectedIndex : languageIndex
  
  if (newSelectedIndex !== selectedIndex) {
    setSelectedIndex(newSelectedIndex)
  }

  const { positionRef, preventLayoutShift } = usePreventLayoutShift()

  return {
    as: 'div' as const,
    ref: positionRef,
    selectedIndex,
    onChange: (newSelectedIndex: number) => {
      preventLayoutShift(() => {
        const newLanguage = availableLanguages[newSelectedIndex]
        setPreferredLanguages(prev => [
          ...prev.filter(lang => lang !== newLanguage),
          newLanguage
        ])
      })
    },
  }
}

const APIGroupContext = createContext(false)

export function APIGroup({
  children,
  title,
  ...props
}: React.ComponentPropsWithoutRef<typeof APIGroupPanels> & { title: string }) {
  const languages =
    Children.map(children, (child) =>
      // @ts-expect-error child.props is not typed
      getPanelTitle(isValidElement(child) ? child.props : {}),
    ) ?? []
  const tabGroupProps = useTabGroupProps(languages)
  const hasTabs = Children.count(children) > 1

  const containerClassName =
    'my-6 overflow-hidden rounded-2xl bg-zinc-900 shadow-md dark:ring-1 dark:ring-white/10'
  const header = (
    <APIGroupHeader title={title} selectedIndex={tabGroupProps.selectedIndex}>
      {children}
    </APIGroupHeader>
  )
  const panels = <APIGroupPanels {...props}>{children}</APIGroupPanels>

  return (
    <APIGroupContext.Provider value={true}>
      {hasTabs ? (
        <TabGroup {...tabGroupProps} className={containerClassName}>
          <div className="not-prose">
            {header}
            {panels}
          </div>
        </TabGroup>
      ) : (
        <div className={containerClassName}>
          <div className="not-prose">
            {header}
            {panels}
          </div>
        </div>
      )}
    </APIGroupContext.Provider>
  )
}

export function API({
  children,
  ...props
}: React.ComponentPropsWithoutRef<'code'>) {
  const isGrouped = useContext(APIGroupContext)

  if (isGrouped) {
    if (typeof children !== 'string') {
      throw new Error(
        '`API` children must be a string when nested inside a `APIGroup`.',
      )
    }
    return <code {...props}>
      {children}
    </code>
  }

  return <code {...props}>{children}</code>
}
