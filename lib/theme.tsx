import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { THEME_KEY, browserStore, writeJson } from "@/domain/localData";
import { requireContext } from "./context";

type Theme = "dark" | "light";
const STORAGE_KEY = THEME_KEY;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  const stored = browserStore()?.getItem(STORAGE_KEY) ?? null;
  if (stored === "light" || stored === "dark") return stored;
  // Football OS is a dark-first command center.
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    // M331: through the door, like the read above — see i18n/index.tsx's provider for the
    // same correction. The theme still applies for the session either way; what the door
    // adds is that a refused write is no longer indistinguishable from a stored one.
    writeJson(browserStore(), STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return requireContext(useContext(ThemeContext), "useTheme must be used within ThemeProvider");
}
