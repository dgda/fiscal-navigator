import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTreasury } from './TreasuryContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isSystemDefault: boolean;
  setUseSystemDefault: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, updatePreferences, loading } = useTreasury();

  const [theme, setTheme] = useState<Theme>('light');
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
    setTheme(newTheme);
  }, []);

  // 1. Sync state from DB on Load
  useEffect(() => {
    if (!loading && data?.preferences) {
      const { theme: dbTheme, useSystemDefault: dbSystem } = data.preferences;

      setIsSystemDefault(dbSystem);

      if (dbSystem) {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        applyTheme(systemTheme);
      } else {
        applyTheme(dbTheme || 'light');
      }
    }
  }, [loading, data?.preferences, applyTheme]);

  // 2. Listen for System Changes
  useEffect(() => {
    if (!isSystemDefault) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Ensure correct sync if we just switched to system default
    if (isSystemDefault) {
      applyTheme(mediaQuery.matches ? 'dark' : 'light');
    }

    const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isSystemDefault, applyTheme]);

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

    if (val) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      applyTheme(systemTheme);
    }

    if (updatePreferences) {
      await updatePreferences({ useSystemDefault: val });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isSystemDefault, setUseSystemDefault }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be within ThemeProvider');
  return ctx;
};
