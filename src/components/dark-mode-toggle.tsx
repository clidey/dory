import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/hooks';
import classNames from 'classnames';

export function DarkModeToggle() {
  const { isDark, currentTheme, toggleMode } = useTheme();
  
  const toggleDarkMode = () => {
    // Toggle between light and dark variants of current theme family
    toggleMode();
  };

  return (
    <button
      onClick={toggleDarkMode}
      className={classNames(
        'rounded-lg p-2 transition-colors duration-200',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {isDark ? (
        <SunIcon className="h-5 w-5 text-yellow-500" />
      ) : (
        <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      )}
    </button>
  );
}