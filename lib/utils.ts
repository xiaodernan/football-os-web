import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// The app's one numeric clamp. domain/careerArc, transfers, worldEngine, projection and training
// each carried their own byte-identical `Math.max(lo, Math.min(hi, v))`; identical today, but five
// definitions that drift the moment one gains a NaN guard. Callers pass (value, low, high).
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// The app's shared round-to-three helper. domain/analytics and domain/matchProbability each carried
// a byte-identical private helper of this shape — the figures behind the Data Room's Poisson
// forecast and the Simulation Lab / Manager match outlook. Identical today, so nothing a reader
// sees changes, but two formulas that part company the moment one is re-rounded. This sits in
// lib/utils and not beside round1 in domain/scouting because scouting reaches analytics through
// data/footballService — analytics importing from scouting would close a cycle, so a rounder shared
// by its consumers must live in this dependency-free module.
export const round3 = (v: number): number => Math.round(v * 1000) / 1000;
