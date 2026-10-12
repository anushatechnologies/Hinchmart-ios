/**
 * HINCH MART Theme Provider
 * Supports light/dark/system/auto theme modes
 * - auto   -> 06:00-17:59 = Light, 18:00-05:59 = Dark (device local time)
 * - light  -> Always light
 * - dark   -> Always dark
 * - system -> Follows device OS preference (backward compat)
 */
import React, { createContext, useContext, useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { Appearance, useColorScheme, ColorSchemeName, Platform, AppState, AppStateStatus } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setThemeMode as setReduxThemeMode } from '../redux/slices/themeSlice';
import { lightTheme, AppTheme } from './lightTheme';
import { darkTheme } from './darkTheme';

export type ThemeMode = 'light' | 'dark' | 'system' | 'auto';

interface ThemeContextValue {
  theme: AppTheme;
  themeMode: ThemeMode;
  isDark: boolean;
  systemScheme: ColorSchemeName;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  themeMode: 'auto',
  isDark: false,
  systemScheme: 'light',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

/** Returns true if local time is nighttime (18:00-05:59) */
function isAutoNightTime(now: Date = new Date()): boolean {
  const h = now.getHours();
  return h < 6 || h >= 18;
}

/** Returns ms until the next theme boundary (6AM or 6PM) */
function msUntilNextBoundary(now: Date = new Date()): number {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();
  const elapsedMs = ((h * 60 + m) * 60 + s) * 1000 + ms;
  const b6AM  = 6  * 60 * 60 * 1000;
  const b6PM  = 18 * 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  if (elapsedMs < b6AM) return b6AM - elapsedMs + 50;
  if (elapsedMs < b6PM) return b6PM - elapsedMs + 50;
  return dayMs - elapsedMs + b6AM + 50;
}

function detectSystemScheme(): ColorSchemeName {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  }
  return Appearance.getColorScheme() || 'light';
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = 'auto' }: ThemeProviderProps) {
  const hookColorScheme = useColorScheme();
  const [currentSystemScheme, setCurrentSystemScheme] = useState<ColorSchemeName>(
    () => hookColorScheme || detectSystemScheme()
  );
  const dispatch = useDispatch();

  // Auto mode state: is it currently nighttime?
  const [isAutoDark, setIsAutoDark] = useState(() => isAutoNightTime());
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One-shot timer chained to next 6AM/6PM boundary — no polling
  const scheduleNextAutoCheck = useCallback(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    const delay = msUntilNextBoundary();
    autoTimerRef.current = setTimeout(() => {
      setIsAutoDark(isAutoNightTime());
      scheduleNextAutoCheck();
    }, delay);
  }, []);

  useEffect(() => {
    scheduleNextAutoCheck();
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, [scheduleNextAutoCheck]);

  // Re-evaluate immediately when app comes to foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        setIsAutoDark(isAutoNightTime());
        scheduleNextAutoCheck();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [scheduleNextAutoCheck]);

  // OS appearance listener (used by 'system' mode only)
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) setCurrentSystemScheme(colorScheme);
    });
    let removeWebListener: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handleWebChange = (e: MediaQueryListEvent | MediaQueryList) =>
        setCurrentSystemScheme(e.matches ? 'dark' : 'light');
      if (mql.addEventListener) {
        mql.addEventListener('change', handleWebChange);
        removeWebListener = () => mql.removeEventListener('change', handleWebChange);
      } else if ((mql as any).addListener) {
        (mql as any).addListener(handleWebChange);
        removeWebListener = () => (mql as any).removeListener(handleWebChange);
      }
    }
    return () => {
      subscription.remove();
      if (removeWebListener) removeWebListener();
    };
  }, []);

  useEffect(() => {
    if (hookColorScheme) setCurrentSystemScheme(hookColorScheme);
  }, [hookColorScheme]);

  // Read persisted theme mode from Redux store
  const reduxThemeMode = useSelector((state: any) => state?.theme?.mode) as ThemeMode | undefined;
  const [themeMode, setThemeModeState] = useState<ThemeMode>(reduxThemeMode || initialMode);

  // Sync when Redux rehydrates after cold start
  useEffect(() => {
    if (reduxThemeMode && reduxThemeMode !== themeMode) setThemeModeState(reduxThemeMode);
  }, [reduxThemeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try { dispatch(setReduxThemeMode(mode)); } catch {}
  }, [dispatch]);

  const isDark = useMemo(() => {
    if (themeMode === 'auto') return isAutoDark;
    if (themeMode === 'system') return currentSystemScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, isAutoDark, currentSystemScheme]);

  const theme: AppTheme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme, themeMode, isDark, systemScheme: currentSystemScheme, setThemeMode, toggleTheme,
  }), [theme, themeMode, isDark, currentSystemScheme, setThemeMode, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

export type { Shadow } from './shadows';
export { ThemeContext };
