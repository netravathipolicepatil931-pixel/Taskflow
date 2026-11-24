import { useCallback, useEffect, useState } from 'react';
import type { ThemeMode } from '../types';

export function useTheme(initialTheme: ThemeMode = 'system') {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = window.localStorage.getItem('taskflow_theme') as ThemeMode | null;
    return stored ?? initialTheme;
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = mode === 'dark' || (mode === 'system' && prefersDark);
    root.classList.toggle('dark', shouldBeDark);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme, applyTheme]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    window.localStorage.setItem('taskflow_theme', next);
  }, []);

  const toggleLightDark = useCallback(() => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    setTheme(isCurrentlyDark ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, setTheme, toggleLightDark };
}
