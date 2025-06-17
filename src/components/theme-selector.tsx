import { Fragment } from 'preact';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, SwatchIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useTheme } from '../utils/hooks';

export function ThemeSelector() {
  const { currentTheme, setTheme, themes } = useTheme();

  return (
    <Listbox value={currentTheme.id} onChange={setTheme}>
      <div className="relative">
        <Listbox.Button className={classNames(
          'relative rounded-lg p-2 transition-colors duration-200',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
          'flex items-center gap-2'
        )}>
          <SwatchIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="sr-only">Theme selector</span>
          <ChevronUpDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className={classNames(
            'absolute right-0 z-50 mt-1 max-h-60 w-64 overflow-auto rounded-md',
            'bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5',
            'focus:outline-none sm:text-sm'
          )}>
            {themes.map((theme) => (
              <Listbox.Option
                key={theme.id}
                className={({ active }) =>
                  classNames(
                    'relative cursor-pointer select-none py-2 pl-10 pr-4',
                    active
                      ? 'bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-100'
                      : 'text-gray-900 dark:text-gray-100'
                  )
                }
                value={theme.id}
              >
                {({ selected }) => (
                  <>
                    <div className="flex flex-col">
                      <span className={classNames(
                        'font-medium',
                        selected ? 'font-semibold' : 'font-normal'
                      )}>
                        {theme.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {theme.description}
                      </span>
                      <div className="flex gap-1 mt-1">
                        <div 
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: theme.colors.bgPrimary }}
                        />
                        <div 
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: theme.colors.textPrimary }}
                        />
                        <div 
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: theme.colors.bgButton }}
                        />
                      </div>
                    </div>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sky-600 dark:text-sky-400">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}