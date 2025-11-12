import {
  createAutocomplete,
  type AutocompleteApi,
  type AutocompleteCollection,
  type AutocompleteState,
} from '@algolia/autocomplete-core'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import {
  forwardRef,
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
} from 'react'
import Highlighter from 'react-highlight-words'
import { cn, Spinner, SearchInput as UxSearchInput } from '@clidey/ux'
import classNames from 'classnames'
import { useLocation } from 'wouter-preact'
import { useMobileNavigation } from '../ui/mobile-navigation'
import { useIsEmbedded, usePathname, useSearchParams } from './hooks'
import { search } from './search-index'
import { ALL_NAVIGATION } from './store'

type EmptyObject = Record<string, never>
type Result = any;

type Autocomplete = AutocompleteApi<
  Result,
  JSX.TargetedEvent,
  JSX.TargetedMouseEvent<HTMLElement>,
  JSX.TargetedKeyboardEvent<HTMLElement>
>

function useAutocomplete({ onNavigate }: { onNavigate: () => void }) {
  const id = useId()
  const [, nav] = useLocation()
  const [autocompleteState, setAutocompleteState] = useState<
    AutocompleteState<Result> | EmptyObject
  >({})

  function navigate({ itemUrl }: { itemUrl?: string }) {
    if (itemUrl) {
      nav(itemUrl);
    }

    onNavigate()
  }

  const [autocomplete] = useState<Autocomplete>(() =>
    createAutocomplete<
      Result,
      JSX.TargetedEvent,
      JSX.TargetedMouseEvent<HTMLElement>,
      JSX.TargetedKeyboardEvent<HTMLElement>
    >({
      id,
      placeholder: 'Find something...',
      defaultActiveItemId: 0,
      onStateChange({ state }) {
        setAutocompleteState(state)
      },
      shouldPanelOpen({ state }) {
        return state.query !== ''
      },
      navigator: {
        navigate,
      },
      getSources({ query }) {
        return [
            {
              sourceId: 'documentation',
              getItems() {
                return search(query, { limit: 5 })
              },
              getItemUrl({ item }) {
                return item.url
              },
              onSelect: navigate,
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
      highlightClassName="underline bg-transparent text-brand-foreground"
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

  const currentPage = result.url.split('#')[0];
  
  // Get the group containing the current page
  const group = ALL_NAVIGATION.find(group => 
    group.groups.some(group => 
      group.pages.some(page => page.href === currentPage)
    )
  );

  const page = group?.groups.find(group => group.pages.find(page => page.href === currentPage));

  const sectionTitle = group?.title;
  const pageTitle = page?.title;
  
  const hierarchy: any[] = [sectionTitle, pageTitle].filter(
    (x): x is string => typeof x === 'string',
  );

  return (
    <li
      className={classNames(
        'group block cursor-default px-4 py-3 aria-selected:bg-zinc-50 dark:aria-selected:bg-zinc-800/50',
      )}
      aria-labelledby={`${id}-hierarchy ${id}-title`}
      {...autocomplete.getItemProps({
        item: result,
        source: collection.source,
      })}
    >
      <div
        id={`${id}-title`}
        aria-hidden="true"
        className="text-sm font-medium text-brand-foreground group-aria-selected:text-brand-foreground"
      >
        <HighlightQuery text={result.title} query={query} />
      </div>
      {hierarchy.length > 0 && (
        <div
          id={`${id}-hierarchy`}
          aria-hidden="true"
          className="mt-1 truncate text-2xs whitespace-nowrap text-zinc-500"
        >
          {hierarchy.map((item, itemIndex, items) => (
            <Fragment key={itemIndex}>
              <HighlightQuery text={item} query={query} />
              <span
                className={
                  itemIndex === items.length - 1
                    ? 'sr-only'
                    : 'mx-2 text-zinc-300 dark:text-zinc-700'
                }
              >
                /
              </span>
            </Fragment>
          ))}
        </div>
      )}
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
    <ul {...autocomplete.getListProps()}>
      {collection.items.map((result) => (
        <SearchResult
          key={result.url}
          result={result}
          autocomplete={autocomplete}
          collection={collection}
          query={query}
        />
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
  }
>(function SearchInput({ autocomplete, autocompleteState, onClose }, inputRef) {
  const inputProps = autocomplete.getInputProps({ inputElement: null })

  return (
    <div className="group relative flex">
      <UxSearchInput
        ref={inputRef}
        data-autofocus
        className={cn({
            'pr-11': autocompleteState.status === 'stalled',
            'pr-4': autocompleteState.status !== 'stalled',
        })}
        {...inputProps}
        onKeyDown={(event) => {
          if (
            event.key === 'Escape' &&
            !autocompleteState.isOpen &&
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
      {autocompleteState.status === 'stalled' && (
        <div className="absolute inset-y-0 right-3 flex items-center">
          <Spinner className="h-5 w-5 animate-spin text-brand-foreground" />
        </div>
      )}
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
  const { autocomplete, autocompleteState } = useAutocomplete({
    onNavigate() {
      onNavigate()
      setOpen(false)
    },
  })
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setOpen(false)
  }, [pathname, searchParams, setOpen])

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
          className="max-sm:mt-[25vh] mx-auto transform-gpu overflow-hidden rounded-lg bg-zinc-50 shadow-xl ring-1 ring-zinc-900/7.5 data-closed:scale-95 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:max-w-xl dark:bg-zinc-900 dark:ring-zinc-800"
        >
          <div {...autocomplete.getRootProps({})}>
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
              />
              <div
                ref={panelRef}
                className="border-t border-zinc-200 bg-white empty:hidden dark:border-zinc-100/5 dark:bg-white/2.5"
                {...autocomplete.getPanelProps({})}
              >
                {autocompleteState.isOpen && (
                  <SearchResults
                    autocomplete={autocomplete}
                    query={autocompleteState.query}
                    collection={autocompleteState.collections[0]}
                  />
                )}
              </div>
            </form>
          </div>
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
      onClick() {
        setOpen(true)
      },
    },
    dialogProps: {
      open,
      setOpen: useCallback(
        (open: boolean) => {
          const { width = 0, height = 0 } =
            inputRef.current?.getBoundingClientRect?.() ?? {}
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
        aria-label="Find something..."
        placeholder="Find something..."
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
        "contents": !isEmbedded,
        "[&_input]:hidden [&_svg]:mr-0 cursor-pointer": isEmbedded,
      }, "lg:hidden")}
      onClick={isEmbedded ? buttonProps.onClick : undefined}
    >
      <UxSearchInput
        className="text-sm"
        aria-label="Find something..."
        {...buttonProps}
        placeholder="Find something..."
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
