import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTreasury } from './TreasuryContext';

type Theme = 'light' | 'dark';

const THEME_CACHE_KEY = 'fnav-theme';

const readSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const readCachedTheme = (): Theme => {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached === 'dark' || cached === 'light') return cached;
  } catch {
    // localStorage unavailable
  }
  return readSystemTheme();
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isSystemDefault: boolean;
  setUseSystemDefault: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, updatePreferences, loading } = useTreasury();

  const [theme, setTheme] = useState<Theme>(readCachedTheme);
  const [isSystemDefault, setIsSystemDefault] = useState(true);

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = window.document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem(THEME_CACHE_KEY, newTheme);
    } catch {
      // localStorage unavailable
    }
    setTheme(newTheme);
  }, []);

  // Resolve theme from DB preferences and (when system default is active) keep in sync with the OS.
  useEffect(() => {
    if (loading || !data?.preferences) return;

    const { theme: dbTheme, useSystemDefault: dbSystem } = data.preferences;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSystemDefault(dbSystem);

    if (!dbSystem) {
      applyTheme(dbTheme || 'light');
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [loading, data?.preferences, applyTheme]);

  // 3. User Actions
  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';

    // Optimistic UI update
    setTheme(nextTheme);
    setIsSystemDefault(false);
    applyTheme(nextTheme);

    // Persist to DB - Single Atomic Call to prevent race condition
    if (updatePreferences) {
      await updatePreferences({
        theme: nextTheme,
        useSystemDefault: false,
      });
    }
  };

  const setUseSystemDefault = async (val: boolean) => {
    setIsSystemDefault(val);

    let themeToPersist: Theme; // This will hold the theme that should be saved to DB

    if (val) { // User wants to use system default
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      applyTheme(systemTheme); // Apply the system theme immediately
      themeToPersist = systemTheme; // Save the system theme as the explicit theme in DB
    } else { // User wants to use an explicit theme (switching off system default)
      // The `theme` state already holds the explicit theme that was active
      // (either from a previous toggle or initial load).
      // We should apply this explicit theme and persist it.
      applyTheme(theme); // Ensure the current explicit theme is applied
      themeToPersist = theme; // Save the current explicit theme to DB
    }

    if (updatePreferences) {
      await updatePreferences({
        useSystemDefault: val,
        theme: themeToPersist, // Always send the theme when updating system default
      });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isSystemDefault, setUseSystemDefault }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be within ThemeProvider');
  return ctx;
};
