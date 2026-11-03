import {
  createAutocomplete,
  type AutocompleteApi,
  type AutocompleteCollection,
  type AutocompleteState,
} from '@algolia/autocomplete-core'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import {
  Fragment,
  forwardRef,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { TargetedEvent, TargetedKeyboardEvent, TargetedMouseEvent } from 'preact'
import Highlighter from 'react-highlight-words'
import { CatalogIcon, cn, Spinner, SearchInput as UxSearchInput } from '@clidey/ux'

import classNames from 'classnames'
import { useLocation } from 'wouter-preact'
import { useMobileNavigation } from '../ui/mobile-navigation'
import { useIsEmbedded, usePathname, useSearchParams } from './hooks'
import { search } from './search-index'
import { ensureSearchContent, getNavigationForPath } from './store'
import { captureDocsEvent } from '../utils/analytics'
import { ChatAssistant, useChatAssistant } from './chat-assistant'

type EmptyObject = Record<string, never>
type Result = { url: string; title: string; pageTitle?: string; kind?: 'ask' }
const ASK_RESULT_URL = '__dory_ask__'

type Autocomplete = AutocompleteApi<
  Result,
  TargetedEvent,
  TargetedMouseEvent<HTMLElement>,
  TargetedKeyboardEvent<HTMLElement>
>

const SUGGESTED_PAGES = 3

/**
 * Results shown before the reader types: the current page, its sections, and
 * the next few pages in navigation order.
 */
function suggestions(pathname: string): Result[] {
  const pages = getNavigationForPath(pathname).flatMap(tab => tab.groups.flatMap(group => group.pages))
  const index = Math.max(0, pages.findIndex(page => page.href === pathname))
  const current = pages[index]
  if (!current) return []
  const sections = Array.from(document.querySelectorAll('.dory-article h2[id]'))
    .filter(heading => !heading.closest('.dory-specimen'))
    .map(heading => ({
      url: `${current.href}#${heading.id}`,
      title: Array.from(heading.childNodes)
        .filter(node => !(node instanceof Element && node.classList.contains('dory-anchor')))
        .map(node => node.textContent ?? '')
        .join('')
        .trim(),
    }))
  const next = pages.slice(index + 1, index + 1 + SUGGESTED_PAGES)
  return [current, ...sections, ...next].map(item => ({ url: 'href' in item ? item.href : item.url, title: item.title }))
}

function useAutocomplete({ onNavigate, onAsk, chatEnabled }: { onNavigate: () => void; onAsk: (query: string) => void; chatEnabled: boolean }) {
  const id = useId()
  const [, nav] = useLocation()
  // getSources is created once, so read the current page through a ref.
  const pathnameRef = useRef('')
  pathnameRef.current = usePathname()
  const queryRef = useRef('')
  const onAskRef = useRef(onAsk)
  onAskRef.current = onAsk
  const chatEnabledRef = useRef(chatEnabled)
  chatEnabledRef.current = chatEnabled
  const [autocompleteState, setAutocompleteState] = useState<
    AutocompleteState<Result> | EmptyObject
  >({})

  function navigate({ itemUrl }: { itemUrl?: string }) {
    if (itemUrl) {
      const query = queryRef.current.trim()
      if (query) captureDocsEvent('docs_search_result_clicked', { query, result: itemUrl, path: pathnameRef.current })
      nav(itemUrl);
    }

    onNavigate()
  }

  const [autocomplete] = useState<Autocomplete>(() =>
    createAutocomplete<
      Result,
      TargetedEvent,
      TargetedMouseEvent<HTMLElement>,
      TargetedKeyboardEvent<HTMLElement>
    >({
      id,
      placeholder: 'Search documentation',
      defaultActiveItemId: 0,
      onStateChange({ state }) {
        queryRef.current = state.query
        setAutocompleteState(state)
      },
      openOnFocus: true,
      shouldPanelOpen() {
        return true
      },
      navigator: {
        navigate,
      },
      getSources({ query }) {
        return [
            {
              sourceId: 'documentation',
              async getItems() {
                if (!query) return suggestions(pathnameRef.current)
                await ensureSearchContent()
                const pages = search(query, { limit: 8 })
                return chatEnabledRef.current
                  ? [{ url: ASK_RESULT_URL, title: query, kind: 'ask' as const }, ...pages]
                  : pages
              },
              getItemUrl({ item }) {
                return item.kind === 'ask' ? undefined : item.url
              },
              onSelect({ item }) {
                if (item.kind === 'ask') onAskRef.current(item.title)
                else navigate({ itemUrl: item.url })
              },
            },
          ]
      },
    }),
  )

  return { autocomplete, autocompleteState }
}

function HighlightQuery({ text, query }: { text: string; query: string }) {
  return (
    <Highlighter
      highlightClassName="dory-search-highlight"
      searchWords={[query]}
      autoEscape={true}
      textToHighlight={text}
    />
  )
}

function SearchResult({
  result,
  autocomplete,
  collection,
  query,
}: {
  result: Result
  autocomplete: Autocomplete
  collection: AutocompleteCollection<Result>
  query: string
}) {
  const id = useId()

  if (result.kind === 'ask') {
    return (
      <li className="dory-search-result dory-search-ask-result flex cursor-default items-center gap-4 px-5 py-3" {...autocomplete.getItemProps({ item: result, source: collection.source })}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]" aria-hidden="true"><CatalogIcon name="ai" className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{result.title}</span>
          <span className="block text-xs text-muted-foreground">Ask Dory · answers cite these docs</span>
        </span>
        <span className="hidden gap-1 text-xs text-muted-foreground sm:flex" aria-hidden="true"><kbd className="dory-search-key">Tab</kbd><kbd className="dory-search-key">↵</kbd></span>
      </li>
    )
  }

  const [currentPage, hash] = result.url.split('#')
  const group = getNavigationForPath(currentPage).flatMap(tab => tab.groups)
    .find(group => group.pages.some(page => page.href === currentPage))
  const pageTitle = group?.pages.find(page => page.href === currentPage)?.title
  // Sections show "Group · Page" above their title; pages show only their group.
  const eyebrow = [group?.title, hash ? pageTitle : undefined].filter(Boolean).join(' · ')

  return (
    <li
      className="dory-search-result group flex cursor-default items-center gap-4 px-8 py-3"
      aria-labelledby={`${id}-hierarchy ${id}-title`}
      {...autocomplete.getItemProps({
        item: result,
        source: collection.source,
      })}
    >
      <span className="dory-search-result-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]" aria-hidden="true"><CatalogIcon name="file" className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div id={`${id}-title`} aria-hidden="true" className="dory-search-title">
          <HighlightQuery text={result.title} query={query} />
        </div>
        {eyebrow && (
          <div id={`${id}-hierarchy`} aria-hidden="true" className="dory-search-eyebrow truncate">
            <HighlightQuery text={eyebrow} query={query} />
          </div>
        )}
      </div>
    </li>
  )
}

function SearchResults({
  autocomplete,
  query,
  collection,
}: {
  autocomplete: Autocomplete
  query: string
  collection: AutocompleteCollection<Result>
}) {
  if (collection.items.length === 0) {
    return (
      <div className="p-6 text-center">
        <svg className="mx-auto h-5 w-5 stroke-zinc-900 dark:stroke-zinc-600" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12.01 12a4.237 4.237 0 0 0 1.24-3c0-.62-.132-1.207-.37-1.738M12.01 12A4.237 4.237 0 0 1 9 13.25c-.635 0-1.237-.14-1.777-.388M12.01 12l3.24 3.25m-3.715-9.661a4.25 4.25 0 0 0-5.975 5.908M4.5 15.5l11-11"
          />
        </svg>
        <p className="mt-2 text-xs">
          Nothing found for{' '}
          <strong className="font-semibold break-words">
            &lsquo;{query}&rsquo;
          </strong>
          . Please try again.
        </p>
      </div>
    )
  }

  return (
    <ul className="py-3" {...autocomplete.getListProps()}>
      {collection.items.map((result, index) => (
        <Fragment key={result.url}>
          {index === 1 && collection.items[0]?.kind === 'ask' && <li className="px-8 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground" role="presentation">Pages</li>}
          <SearchResult
            result={result}
            autocomplete={autocomplete}
            collection={collection}
            query={query}
          />
        </Fragment>
      ))}
    </ul>
  )
}

const SearchInput = forwardRef<
  React.ElementRef<'input'>,
  {
    autocomplete: Autocomplete
    autocompleteState: AutocompleteState<Result> | EmptyObject
    onClose: () => void
    onAsk: () => void
    chatEnabled: boolean
  }
>(function SearchInput({ autocomplete, autocompleteState, onClose, onAsk, chatEnabled }, inputRef) {
  const inputProps = autocomplete.getInputProps({ inputElement: null })

  return (
    <div className="relative flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-7">
      <CatalogIcon name="search" aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        data-autofocus
        className="dory-search-input h-full min-w-0 flex-1 bg-transparent outline-none"
        {...inputProps}
        onKeyDown={(event) => {
          if (event.key === 'Tab' && !event.shiftKey && chatEnabled) {
            event.preventDefault()
            onAsk()
          } else if (
            event.key === 'Escape' &&
            autocompleteState.query === ''
          ) {
            // In Safari, closing the dialog with the escape key can sometimes cause the scroll position to jump to the
            // bottom of the page. This is a workaround for that until we can figure out a proper fix in Headless UI.
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur()
            }

            onClose()
          } else {
            inputProps.onKeyDown(event)
          }
        }}
      />
      {autocompleteState.status === 'stalled'
        ? <Spinner className="h-5 w-5 animate-spin text-brand-foreground" />
        : null}
      <span className="dory-search-active" aria-current="page">Search</span>
      {chatEnabled && <button type="button" className="dory-search-ask-button" onClick={onAsk}>Ask Dory</button>}
    </div>
  )
})

function SearchDialog({
  open,
  setOpen,
  className,
  onNavigate = () => {},
}: {
  open: boolean
  setOpen: (open: boolean) => void
  className?: string
  onNavigate?: () => void
}) {
  const formRef = useRef<React.ElementRef<'form'>>(null)
  const panelRef = useRef<React.ElementRef<'div'>>(null)
  const inputRef = useRef<React.ElementRef<typeof SearchInput>>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const chat = useChatAssistant()
  const [mode, setMode] = useState<'search' | 'chat'>('search')
  const { autocomplete, autocompleteState } = useAutocomplete({
    onNavigate() {
      onNavigate()
      setOpen(false)
    },
    onAsk: askSearchQuery,
    chatEnabled: chat.enabled,
  })

  function askSearchQuery(query: string) {
    if (!chat.enabled) return
    captureDocsEvent('docs_chat_opened', { path: window.location.pathname })
    setMode('chat')
    if (query.trim().length >= 3) void chat.ask(query)
    else chat.setDraft(query)
  }

  function showChat() {
    if (!chat.enabled) return
    const query = autocompleteState.query?.trim()
    if (query) chat.setDraft(query)
    captureDocsEvent('docs_chat_opened', { path: window.location.pathname })
    setMode('chat')
  }

  function showSearch() {
    if (chat.draft.trim() && !autocompleteState.query?.trim()) autocomplete.setQuery(chat.draft)
    setMode('search')
  }

  useEffect(() => {
    if (chat.enabled && autocompleteState.query) void autocomplete.refresh()
  }, [chat.enabled])

  useEffect(() => {
    if (!open || !autocompleteState.isOpen || !autocompleteState.collections) return
    const query = autocompleteState.query?.trim()
    if (!query) return
    const resultCount = autocompleteState.collections.reduce((count, collection) => count + collection.items.filter(item => item.kind !== 'ask').length, 0)
    const timeout = window.setTimeout(() => {
      captureDocsEvent('docs_search', { query, result_count: resultCount, path: pathname })
    }, 600)
    return () => window.clearTimeout(timeout)
  }, [open, autocompleteState.query, autocompleteState.collections, autocompleteState.isOpen, pathname])

  useEffect(() => {
    setOpen(false)
  }, [pathname, searchParams, setOpen])

  useEffect(() => {
    if (!open) setMode('search')
  }, [open])

  useEffect(() => {
    if (open) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, setOpen])

  return (
    <Dialog
      open={open}
      onClose={() => {
        setOpen(false)
        autocomplete.setQuery('')
      }}
      className={classNames('fixed inset-0 z-50', className)}
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-400/25 backdrop-blur-xs data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-black/40"
      />

      <div className="fixed inset-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-20 md:py-32 lg:px-8 lg:py-[15vh] max-w-[calc(100vw-16px)]">
        <DialogPanel
          transition
          className="dory-search-panel max-sm:mt-[4vh] mx-auto transform-gpu overflow-hidden data-closed:scale-95 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:max-w-5xl"
        >
          {mode === 'search' ? <div {...autocomplete.getRootProps({})}>
            <form
              ref={formRef}
              {...autocomplete.getFormProps({
                inputElement: inputRef.current,
              })}
            >
              <SearchInput
                ref={inputRef}
                autocomplete={autocomplete}
                autocompleteState={autocompleteState}
                onClose={() => setOpen(false)}
                onAsk={showChat}
                chatEnabled={chat.enabled}
              />
              <div
                ref={panelRef}
                className="max-h-[60vh] overflow-y-auto border-t border-[var(--border)] empty:hidden"
                {...autocomplete.getPanelProps({})}
              >
                {autocompleteState.isOpen && autocompleteState.collections[0] && (
                  <SearchResults
                    autocomplete={autocomplete}
                    query={autocompleteState.query}
                    collection={autocompleteState.collections[0]}
                  />
                )}
              </div>
            </form>
            <div className="dory-search-footer" aria-hidden="true">
              <span>↑ ↓ Navigate</span><span>↵ Open</span>{chat.enabled && <span>Tab Ask Dory</span>}<span>Esc Close</span>
            </div>
          </div> : <>
            <div className="dory-search-tabs flex items-center gap-2 border-b border-[var(--border)] px-5 py-4 sm:px-7">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-foreground">Ask Dory</h2>
                <p className="text-xs text-muted-foreground">Grounded in these docs</p>
              </div>
              {chat.messages.length > 0 && <button type="button" onClick={chat.reset} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-[var(--accent)]">+ New</button>}
              <button type="button" onClick={showSearch} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-[var(--accent)]">Search</button>
              <span className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white">Ask Dory</span>
            </div>
            <ChatAssistant chat={chat} onNavigate={() => { onNavigate(); setOpen(false) }} onSearch={showSearch} />
          </>}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function useSearchProps() {
  const inputRef = useRef<React.ElementRef<typeof SearchInput>>(null)
  const [open, setOpen] = useState(false)

  return {
    inputProps: {
      ref: inputRef,
      readOnly: true,
      onClick() {
        setOpen(true)
      },
    },
    dialogProps: {
      open,
      setOpen: useCallback(
        (open: boolean) => {
          const trigger = inputRef.current?.closest('[data-slot="search-input-wrapper"]') ?? inputRef.current
          const { width = 0, height = 0 } =
            trigger?.getBoundingClientRect?.() ?? {}
          if (!open || (width !== 0 && height !== 0)) {
            setOpen(open)
          }
        },
        [setOpen],
      ),
    },
  }
}

export function Search() {
  const { inputProps: buttonProps, dialogProps } = useSearchProps();
  const isEmbedded = useIsEmbedded();

  return (
    <div
      className={cn("hidden lg:block lg:max-w-md lg:flex-auto", {
        "[&_input]:hidden [&_svg]:mr-0 cursor-pointer": isEmbedded,
      })}
      onClick={isEmbedded ? buttonProps.onClick : undefined}
    >
      <UxSearchInput
        aria-label="Search documentation"
        placeholder="Search documentation"
        {...buttonProps}
      />
      <Suspense fallback={null}>
        <SearchDialog className="hidden lg:block" {...dialogProps} />
      </Suspense>
    </div>
  )
}

export function MobileSearch() {
  const { close } = useMobileNavigation()
  const { inputProps: buttonProps, dialogProps } = useSearchProps()
  const isEmbedded = useIsEmbedded();

  return (
    <div
      className={cn({
        "inline-flex": !isEmbedded,
        "[&_input]:hidden [&_svg]:mr-0 cursor-pointer": isEmbedded,
      }, "lg:hidden")}
      role="button"
      tabIndex={0}
      aria-label="Search documentation"
      onClick={buttonProps.onClick}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          buttonProps.onClick()
        }
      }}
    >
      <UxSearchInput
        className="text-sm"
        aria-label="Search documentation"
        {...buttonProps}
        placeholder="Search documentation"
      />
      <Suspense fallback={null}>
        <SearchDialog
          className="lg:hidden"
          onNavigate={close}
          {...dialogProps}
        />
      </Suspense>
    </div>
  )
}
