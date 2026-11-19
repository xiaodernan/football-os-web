// M1201 · The one door every release-time public artifact reads through.
// The wire diary (M1175) and the frozen diary (M1201) ship the same shape the same way: a
// same-origin JSON file cut at release time by CI (the model imprisoned to a committed fold)
// and served unchanged by the static host. The fold-check lives with the artifact guards in
// each diary module; only the READ mechanics — one cached promise, one fetch per page load,
// one shape guard — live here. Honest degrade without the file: null, never a fake payload.

const cache = new Map<string, Promise<unknown | null>>();

export async function fetchReleaseArtifact<T>(path: string, isShape: (p: unknown) => p is T): Promise<T | null> {
  if (cache.has(path)) return cache.get(path) as Promise<T | null>;
  const p = fetch(path, { cache: "no-cache" })
    .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
    .then((j) => (isShape(j) ? j : null))
    .catch(() => null);
  cache.set(path, p);
  return p;
}
