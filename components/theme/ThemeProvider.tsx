"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "mood-studio-v2-theme";

// External store for theme — React Compiler safe (useSyncExternalStore)
let listeners: Array<() => void> = [];
let currentTheme: Theme = "light";

function getThemeSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribeTheme(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function setThemeStore(t: Theme) {
  currentTheme = t;
  listeners.forEach((l) => l());
}

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(t: Theme): "light" | "dark" {
  if (t === "system") return getSystemPrefersDark() ? "dark" : "light";
  return t;
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);

  // V2: earth-tone meta-theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#1a1a1a" : "#faf8f5");
  }
}

// Anti-FOUC inline script
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('${STORAGE_KEY}') || 'light';
    var r = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    document.documentElement.classList.add(r);
  } catch(e) {}
})()
`;

// Initialize from localStorage at module load
if (typeof window !== "undefined") {
  currentTheme = (localStorage.getItem(STORAGE_KEY) as Theme) || "light";
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerSnapshot,
  );

  const resolvedTheme: "light" | "dark" = resolve(theme);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(resolve(theme));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    setThemeStore(newTheme);
    applyTheme(resolve(newTheme));
  }, []);

  const toggleTheme = useCallback(() => {
    const current = resolve(
      (localStorage.getItem(STORAGE_KEY) as Theme) || "light",
    );
    setTheme(current === "light" ? "dark" : "light");
  }, [setTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      <script
        dangerouslySetInnerHTML={{ __html: themeScript }}
        suppressHydrationWarning
      />
      {children}
    </ThemeContext.Provider>
  );
}
