"use client"

import { cn } from "@/lib/utils"

interface SimpleSliderProps {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  format: (v: number) => string
}

export function SimpleSlider({ label, min, max, step, value, onChange, format }: SimpleSliderProps) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-primary">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("mt-1 w-full accent-[var(--color-primary)]")}
      />
    </label>
  )
}