"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

export type ThemeSetting = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeSetting;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeSetting) => void;
  systemTheme: ResolvedTheme | undefined;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(defaultTheme: ThemeSetting): ThemeSetting {
  if (typeof window === "undefined") return defaultTheme;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return defaultTheme;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function resolveTheme(theme: ThemeSetting, enableSystem: boolean): ResolvedTheme {
  if (theme === "system" && enableSystem) return getSystemTheme();
  return theme === "light" ? "light" : "dark";
}

function applyTheme(resolved: ResolvedTheme, disableTransitionOnChange: boolean) {
  const root = document.documentElement;
  let restoreTransitions: (() => void) | undefined;

  if (disableTransitionOnChange) {
    const style = document.createElement("style");
    style.textContent =
      "*,*::before,*::after{transition:none!important;-webkit-transition:none!important}";
    document.head.appendChild(style);
    restoreTransitions = () => {
      window.getComputedStyle(document.body);
      setTimeout(() => document.head.removeChild(style), 1);
    };
  }

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;

  restoreTransitions?.();
}

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: ThemeSetting;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeSetting>(() =>
    readStoredTheme(defaultTheme),
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme(),
  );

  const resolvedTheme = useMemo(
    () => resolveTheme(theme, enableSystem),
    [theme, enableSystem, systemTheme],
  );

  const setTheme = useCallback((next: ThemeSetting) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme, disableTransitionOnChange);
  }, [resolvedTheme, disableTransitionOnChange]);

  useEffect(() => {
    if (!enableSystem) return;
    const media = window.matchMedia(MEDIA_QUERY);
    const onChange = () => setSystemTheme(getSystemTheme());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [enableSystem]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setThemeState(readStoredTheme(defaultTheme));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [defaultTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      systemTheme: enableSystem ? systemTheme : undefined,
    }),
    [theme, resolvedTheme, setTheme, enableSystem, systemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
