import { Fragment } from 'preact';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, SwatchIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { useTheme } from '../utils/hooks';

export function ThemeSelector() {
  const { currentTheme, setTheme, toggleMode, getThemesByBase } = useTheme();
  const themesByBase = getThemesByBase();

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
  };

  const getCurrentBaseTheme = () => {
    return currentTheme.id.replace('-light', '').replace('-dark', '');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Light/Dark Mode Toggle */}
      <button
        onClick={toggleMode}
        className={classNames(
          'relative rounded-lg p-2 transition-colors duration-200',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'
        )}
        title={`Switch to ${currentTheme.mode === 'light' ? 'dark' : 'light'} mode`}
      >
        {currentTheme.mode === 'light' ? (
          <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        )}
        <span className="sr-only">Toggle light/dark mode</span>
      </button>

      {/* Theme Selector */}
      <Listbox value={getCurrentBaseTheme()} onChange={(baseThemeId) => {
        const newThemeId = `${baseThemeId}-${currentTheme.mode}`;
        handleThemeChange(newThemeId);
      }}>
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
              'absolute right-0 z-50 mt-1 max-h-60 w-80 overflow-auto rounded-md',
              'bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5',
              'focus:outline-none sm:text-sm'
            )}>
              {Array.from(themesByBase.entries()).map(([baseThemeId, variants]) => {
                const lightTheme = variants.light;
                const darkTheme = variants.dark;
                const displayTheme = currentTheme.mode === 'light' ? lightTheme : darkTheme;
                
                if (!displayTheme) return null;

                return (
                  <Listbox.Option
                    key={baseThemeId}
                    className={({ active }) =>
                      classNames(
                        'relative cursor-pointer select-none py-3 pl-10 pr-4',
                        active
                          ? 'bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-100'
                          : 'text-gray-900 dark:text-gray-100'
                      )
                    }
                    value={baseThemeId}
                  >
                    {({ selected }) => (
                      <>
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <span className={classNames(
                              'font-medium',
                              selected ? 'font-semibold' : 'font-normal'
                            )}>
                              {displayTheme.name.replace(' Light', '').replace(' Dark', '')}
                            </span>
                            <div className="flex gap-1">
                              {lightTheme && (
                                <div className="flex items-center gap-1">
                                  <SunIcon className="h-3 w-3 text-gray-400" />
                                  <div className="flex gap-0.5">
                                    <div 
                                      className="w-2 h-2 rounded-full border border-gray-300"
                                      style={{ backgroundColor: lightTheme.colors.bgPrimary }}
                                    />
                                    <div 
                                      className="w-2 h-2 rounded-full border border-gray-300"
                                      style={{ backgroundColor: lightTheme.colors.textPrimary }}
                                    />
                                    <div 
                                      className="w-2 h-2 rounded-full border border-gray-300"
                                      style={{ backgroundColor: lightTheme.colors.bgButton }}
                                    />
                                  </div>
                                </div>
                              )}
                              {darkTheme && (
                                <div className="flex items-center gap-1 ml-2">
                                  <MoonIcon className="h-3 w-3 text-gray-400" />
                                  <div className="flex gap-0.5">
                                    <div 
                                      className="w-2 h-2 rounded-full border border-gray-300"
                                      style={{ backgroundColor: darkTheme.colors.bgPrimary }}
                                    />
                                    <div 
                                      className="w-2 h-2 rounded-full border border-gray-300"
                                      style={{ backgroundColor: darkTheme.colors.textPrimary }}
                                    />
                                    <div 
                                      className="w-2 h-2 rounded-full border border-gray-300"
                                      style={{ backgroundColor: darkTheme.colors.bgButton }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {displayTheme.description.replace(' (Light mode)', '').replace(' (Dark mode)', '')}
                          </span>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span>Font: {displayTheme.typography.fontFamilyPrimary.split(',')[0].replace(/"/g, '')}</span>
                            <span>•</span>
                            <span>Radius: {displayTheme.spacing.radiusMd}</span>
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
                );
              })}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}