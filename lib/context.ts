// The guard every context hook spells, in one place.

/** Read a required context, or throw the provider's own diagnostic. The guard — read the context,
 *  throw when the provider is missing, return the value — was spelled three times (useRouter,
 *  useTheme, useOs), and the full-body rule census pairs all three (M444). One door now: the caller
 *  passes the context it read and the message its provider owns, so the guard's shape lives once
 *  while each hook keeps its own diagnostic. Not a hook itself — it calls no React API — so it is
 *  safe to call from inside one. */
export function requireContext<T>(ctx: T | null, message: string): T {
  if (!ctx) throw new Error(message);
  return ctx;
}
