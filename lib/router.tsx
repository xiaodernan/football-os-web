import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";

interface RouterValue {
  path: string;
  segments: string[];
  query: URLSearchParams;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

function readLocation(): { path: string; query: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [pathname, search = ""] = raw.split("?");
  return { path: pathname || "/", query: new URLSearchParams(search) };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(readLocation);

  useEffect(() => {
    const onChange = () => setLoc(readLocation());
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) window.location.replace("#/");
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const target = to.startsWith("#") ? to : `#${to}`;
    if (opts?.replace) window.location.replace(target);
    else window.location.hash = target.slice(1);
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo<RouterValue>(
    () => ({
      path: loc.path,
      segments: loc.path.split("/").filter(Boolean),
      query: loc.query,
      navigate,
    }),
    [loc, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used within RouterProvider");
  return ctx;
}

/** Match "/players/:id" style patterns; returns params or null. */
export function matchRoute(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const pp = pattern.split("/").filter(Boolean);
  const cp = path.split("/").filter(Boolean);
  if (pp.length !== cp.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) params[pp[i].slice(1)] = decodeURIComponent(cp[i]);
    else if (pp[i] !== cp[i]) return null;
  }
  return params;
}

export function Link({
  to,
  children,
  className,
  onClick,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { navigate } = useRouter();
  const handle = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onClick?.();
    navigate(to);
  };
  return (
    <a href={`#${to}`} className={className} onClick={handle}>
      {children}
    </a>
  );
}
