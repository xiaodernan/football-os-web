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
import { requireContext } from "./context";

interface RouterValue {
  path: string;
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
      query: loc.query,
      navigate,
    }),
    [loc, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  return requireContext(useContext(RouterContext), "useRouter must be used within RouterProvider");
}

/** A hash is typed by a visitor, so any segment may be a malformed escape (`#/players/%`).
 *  `decodeURIComponent` throws on those; keeping the raw text lets the detail page render its
 *  own not-found state instead of blanking the tree, which has no error boundary. */
function decodeSegment(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/** Match "/players/:id" style patterns; returns params or null. */
export function matchRoute(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const pp = pattern.split("/").filter(Boolean);
  const cp = path.split("/").filter(Boolean);
  const required = pp.filter((s) => !s.endsWith("?")).length;
  if (cp.length < required || cp.length > pp.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < cp.length; i++) {
    const seg = pp[i];
    if (seg.startsWith(":")) params[seg.slice(1).replace(/\?$/, "")] = decodeSegment(cp[i]);
    else if (seg !== cp[i]) return null;
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
