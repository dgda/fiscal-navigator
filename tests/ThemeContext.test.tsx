// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

const updatePreferencesMock = vi.fn(async () => {});
let mockTreasury: ReturnType<typeof makeTreasury>;

vi.mock('../src/context/TreasuryContext', () => ({
  useTreasury: () => mockTreasury,
}));

function makeTreasury(
  overrides: Partial<{
    loading: boolean;
    theme: 'light' | 'dark';
    useSystemDefault: boolean;
  }> = {},
) {
  return {
    data: {
      preferences: {
        theme: overrides.theme ?? 'light',
        useSystemDefault: overrides.useSystemDefault ?? true,
      },
    },
    loading: overrides.loading ?? false,
    updatePreferences: updatePreferencesMock,
  };
}

let mediaListeners: Array<(e: MediaQueryListEvent) => void> = [];
let systemPrefersDark = false;

function setupMatchMedia(prefersDark: boolean) {
  systemPrefersDark = prefersDark;
  mediaListeners = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      void query;
      return {
        matches: systemPrefersDark,
        addEventListener: (
          _event: string,
          listener: (e: MediaQueryListEvent) => void,
        ) => {
          mediaListeners.push(listener);
        },
        removeEventListener: (
          _event: string,
          listener: (e: MediaQueryListEvent) => void,
        ) => {
          mediaListeners = mediaListeners.filter((l) => l !== listener);
        },
      };
    }),
  );
  // jsdom defines window.matchMedia separately from globalThis.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: globalThis.matchMedia,
  });
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  updatePreferencesMock.mockClear();
  mockTreasury = makeTreasury();
  setupMatchMedia(false);
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeContext initial sync', () => {
  test('given useSystemDefault=true and system prefers light, when provider mounts, then theme is light and dark class is removed', async () => {
    setupMatchMedia(false);
    mockTreasury = makeTreasury({ useSystemDefault: true });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('light'));
    expect(result.current.isSystemDefault).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('given useSystemDefault=true and system prefers dark, when provider mounts, then theme is dark and dark class is applied', async () => {
    setupMatchMedia(true);
    mockTreasury = makeTreasury({ useSystemDefault: true });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('given useSystemDefault=false and stored theme=dark with system preferring light, when provider mounts, then stored theme wins over system', async () => {
    setupMatchMedia(false);
    mockTreasury = makeTreasury({ useSystemDefault: false, theme: 'dark' });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('dark'));
    expect(result.current.isSystemDefault).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('given useSystemDefault=false and stored theme=light with system preferring dark, when provider mounts, then stored theme wins over system', async () => {
    setupMatchMedia(true);
    mockTreasury = makeTreasury({ useSystemDefault: false, theme: 'light' });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('light'));
    expect(result.current.isSystemDefault).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('ThemeContext toggleTheme', () => {
  test('given theme=light, when toggleTheme is called, then theme flips to dark and dark class is added', async () => {
    mockTreasury = makeTreasury({ useSystemDefault: false, theme: 'light' });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('light'));
    await act(async () => {
      await result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('given toggleTheme is called, then updatePreferences is invoked with theme=next AND useSystemDefault=false', async () => {
    mockTreasury = makeTreasury({ useSystemDefault: true, theme: 'light' });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('light'));
    await act(async () => {
      await result.current.toggleTheme();
    });
    expect(updatePreferencesMock).toHaveBeenCalledWith({
      theme: 'dark',
      useSystemDefault: false,
    });
  });

  test('given toggleTheme flips to dark, then isSystemDefault becomes false', async () => {
    mockTreasury = makeTreasury({ useSystemDefault: true, theme: 'light' });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('light'));
    await act(async () => {
      await result.current.toggleTheme();
    });
    expect(result.current.isSystemDefault).toBe(false);
  });
});

describe('ThemeContext setUseSystemDefault', () => {
  test('given setUseSystemDefault(true) and system prefers dark, then theme follows system and updatePreferences receives the resolved theme', async () => {
    setupMatchMedia(true);
    mockTreasury = makeTreasury({ useSystemDefault: false, theme: 'light' });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(async () => {
      await result.current.setUseSystemDefault(true);
    });
    expect(result.current.isSystemDefault).toBe(true);
    expect(result.current.theme).toBe('dark');
    expect(updatePreferencesMock).toHaveBeenLastCalledWith({
      useSystemDefault: true,
      theme: 'dark',
    });
  });

  test('given setUseSystemDefault(false), then the currently displayed theme is persisted as the explicit theme', async () => {
    setupMatchMedia(true);
    mockTreasury = makeTreasury({ useSystemDefault: true });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('dark'));
    await act(async () => {
      await result.current.setUseSystemDefault(false);
    });
    expect(updatePreferencesMock).toHaveBeenLastCalledWith({
      useSystemDefault: false,
      theme: 'dark',
    });
  });
});

describe('ThemeContext system preference listener', () => {
  test('given useSystemDefault=true, when the OS preference changes, then theme follows the change', async () => {
    setupMatchMedia(false);
    mockTreasury = makeTreasury({ useSystemDefault: true });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('light'));
    await act(async () => {
      mediaListeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
    });
    expect(result.current.theme).toBe('dark');
  });

  test('given useSystemDefault=false, when the OS preference changes, then theme is unchanged (listener not registered)', async () => {
    setupMatchMedia(false);
    mockTreasury = makeTreasury({ useSystemDefault: false, theme: 'light' });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('light'));
    await act(async () => {
      mediaListeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
    });
    expect(result.current.theme).toBe('light');
  });
});

describe('ThemeContext localStorage cache (anti-flash)', () => {
  test('given a theme is applied, then it is mirrored to localStorage so the inline boot script can read it on next load', async () => {
    mockTreasury = makeTreasury({ useSystemDefault: false, theme: 'dark' });
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBe('dark'));
    expect(localStorage.getItem('fnav-theme')).toBe('dark');
  });

  test('given a cached theme exists, then initial render uses it before the DB resolves (no flash)', async () => {
    localStorage.setItem('fnav-theme', 'dark');
    setupMatchMedia(false);
    // simulate Treasury still loading: hook does not commit, but theme initial state should be dark
    mockTreasury = { ...makeTreasury(), loading: true };
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.theme).toBe('dark');
  });

  test('given no cached theme and system prefers dark, then initial state falls back to system (dark)', async () => {
    setupMatchMedia(true);
    mockTreasury = { ...makeTreasury(), loading: true };
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.theme).toBe('dark');
  });
});

describe('ThemeContext useTheme guard', () => {
  test('given useTheme is called outside ThemeProvider, then it throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useTheme())).toThrow(/within ThemeProvider/);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
