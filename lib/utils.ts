import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// The app's one numeric clamp. domain/careerArc, transfers, worldEngine, projection and training
// each carried their own byte-identical `Math.max(lo, Math.min(hi, v))`; identical today, but five
// definitions that drift the moment one gains a NaN guard. Callers pass (value, low, high).
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
