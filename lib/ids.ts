// An id is the handle for ONE event: minted where the event happens, and never derived
// from when it happened or from what it says. Both of those derivations were live bugs
// in this tree, and each one handed two different events a single handle.
//
//   * `S${...last five base-36 digits of the clock}` read the clock and kept its final
//     five digits, so the handle came back around every 36^5 ms ≈ 16.8 hours. Two
//     plans minted a day apart gave the store the same session id, and the store reads a
//     matching session id as the same session (`sessions.filter((s) => s.id !== ...)`),
//     so the newer plan deleted the older one — including a *completed* session, whose
//     XP stayed on the profile while its row left the training list, the load model and
//     the activity timeline.
//   * `P${makeRng(\`coach-${hashString(ask + displayName)}\`)().toString(36).slice(2, 7)}`
//     read the content, so one player asking one question twice — or two players sharing
//     a display name and a complaint — got one handle for two plans, and
//     `domain/history` built two timeline rows carrying that one key.
//
// What stays deterministic is the content: a plan's exercises, diagnosis and numbers are
// still reproducible from its seed, which is the Demo Mode contract ./rng states. Only
// the handle is fresh per call, because two calls are two events however alike they look.
//
// The three parts answer the three ways two mints can meet:
//   - the clock is kept whole rather than truncated, so a mint in a later millisecond
//     differs from every mint before it;
//   - a per-process sequence separates two mints inside the same millisecond;
//   - a salt drawn once per module instance separates two instances — two tabs, or a
//     reload that restored rows minted before it — reaching the same sequence in the same
//     millisecond. Across instances that last part is overwhelmingly likely, not certain:
//     36^8 ≈ 2.8e12 outcomes, stated here rather than claimed as a proof.

let seq = 0;
// Fixed width, so a shorter draw cannot let two different (sequence, salt) pairs
// concatenate into the same string.
const SALT = Math.floor(Math.random() * 36 ** 8)
  .toString(36)
  .padStart(8, "0");

/** Mint a fresh handle for one event. The value is opaque — nothing reads it as data. */
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}-${seq.toString(36)}-${SALT}`;
}
