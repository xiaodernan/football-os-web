import io
p = "ui/FirstRunGuide.tsx"
s = io.open(p, encoding="utf-8").read()

old = '''import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useLocalStorage } from "@/lib/hooks";'''
new = '''import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useLocalStorage } from "@/lib/hooks";
import { useRouter } from "@/lib/router";
import { browserStore, readJson } from "@/domain/localData";'''
assert old in s, "imports"
s = s.replace(old, new, 1)

old = '''  // Escape dismisses for good — the same promise the Skip button makes.'''
new = '''  // The guide is one singleton mounted in the shell, but its key can be rewritten by another
  // surface while it is mounted — the settings row's replay, or the palette's, both of which
  // then land on the board. A storage write in the same tab updates nobody's React state, so the
  // guide re-reads the key on every route change (and on the cross-tab storage event), adopting
  // the new value when it differs. Without this, a replay would only take effect after a reload.
  useEffect(() => {
    const adopt = () => setState((prev) => {
      const stored = parseTour(readJson(browserStore(), TOUR_KEY, initialTour()).value);
      return JSON.stringify(stored) === JSON.stringify(prev) ? prev : stored;
    });
    adopt();
    window.addEventListener("storage", adopt);
    return () => window.removeEventListener("storage", adopt);
  }, [path, setState]);

  // Escape dismisses for good — the same promise the Skip button makes.'''
assert old in s, "escape anchor"
s = s.replace(old, new, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("patched")
