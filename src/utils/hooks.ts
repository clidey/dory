import { useEffect, useState } from 'preact/hooks';
import { getTheme, themes, type Theme } from '../themes/theme-config';

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

export function useTheme() {
  // Get initial theme from localStorage or default to system preference
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return themes[0]; // Default to light theme on server
    }
    
    const storedThemeId = localStorage.getItem('selectedTheme');
    if (storedThemeId) {
      const theme = getTheme(storedThemeId);
      if (theme) return theme;
    }
    
    // Fallback to dark/light based on system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return getTheme(prefersDark ? 'default-dark' : 'default-light') || themes[0];
  });

  // Apply theme CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    if (!root || !body) return;

    // Apply all theme colors as CSS custom properties
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    // Apply typography properties as CSS custom properties
    Object.entries(currentTheme.typography).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    // Apply spacing properties as CSS custom properties
    Object.entries(currentTheme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    // Set theme class for legacy compatibility
    if (currentTheme.isDark) {
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      body.classList.add('light');
      body.classList.remove('dark');
    }

    // Set theme-specific class
    body.className = body.className.replace(/theme-[a-z-]+/g, '');
    body.classList.add(`theme-${currentTheme.id.replace('-light', '').replace('-dark', '')}`);

    // Store theme preference
    localStorage.setItem('selectedTheme', currentTheme.id);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const theme = getTheme(themeId);
    if (theme) {
      setCurrentTheme(theme);
    }
  };

  const toggleTheme = () => {
    const currentIndex = themes.findIndex(t => t.id === currentTheme.id);
    const nextIndex = (currentIndex + 1) % themes.length;
    setCurrentTheme(themes[nextIndex]);
  };

  const toggleMode = () => {
    const currentBaseThemeId = currentTheme.id.replace('-light', '').replace('-dark', '');
    const newMode = currentTheme.mode === 'light' ? 'dark' : 'light';
    const newThemeId = `${currentBaseThemeId}-${newMode}`;
    const newTheme = getTheme(newThemeId);
    if (newTheme) {
      setCurrentTheme(newTheme);
    }
  };

  const getThemesByBase = () => {
    const themesByBase = new Map();
    themes.forEach(theme => {
      const baseId = theme.id.replace('-light', '').replace('-dark', '');
      if (!themesByBase.has(baseId)) {
        themesByBase.set(baseId, { light: null, dark: null });
      }
      const entry = themesByBase.get(baseId);
      if (theme.mode === 'light') {
        entry.light = theme;
      } else {
        entry.dark = theme;
      }
    });
    return themesByBase;
  };

  return {
    currentTheme,
    setTheme,
    toggleTheme,
    toggleMode,
    getThemesByBase,
    themes: themes,
    isDark: currentTheme.isDark
  };
}