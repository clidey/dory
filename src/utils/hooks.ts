import { useEffect, useState } from 'preact/hooks';

export function useDarkMode() {
  // Check localStorage and system preference on initial load
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      return JSON.parse(stored);
    }
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Update the HTML class and localStorage when isDark changes
  useEffect(() => {
    const body = document.querySelector('body');
    if (!body) return;
    if (isDark) {
      body.classList.add('dark');
    } else {
      body.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      const stored = localStorage.getItem('darkMode');
      if (stored === null) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = () => setIsDark(!isDark);

  return { isDark, toggleDarkMode };
}