import type { StepTypeEntry, ColorMapEntry } from '@commons/types/recipe'

export const STEP_TYPES = [
  { key: "pre_dough", label: "Pre-Impasto", icon: "🧪" },
  { key: "dough", label: "Impasto", icon: "🖐️" },
  { key: "rest", label: "Riposo", icon: "❄️" },
  { key: "rise", label: "Lievitazione", icon: "⏳" },
  { key: "shape", label: "Formatura", icon: "🔄" },
  { key: "bake", label: "Cottura", icon: "🔥" },
  { key: "done", label: "Pronto!", icon: "🎉" },
] as const satisfies ReadonlyArray<StepTypeEntry>

export const COLOR_MAP: Record<string, ColorMapEntry> = {
  pre_dough: { bg: "#f5eef8", tx: "#7050a0", lb: "Pre-Imp." },
  dough: { bg: "#eef0f5", tx: "#5a6070", lb: "Impasto" },
  rest: { bg: "#f5f0ea", tx: "#7a6a55", lb: "Riposo" },
  rise: { bg: "#fef6ed", tx: "#8a6e40", lb: "Lievitaz." },
  shape: { bg: "#f0eef5", tx: "#6050a0", lb: "Formatura" },
  bake: { bg: "#fdeee8", tx: "#8a4a30", lb: "Cottura" },
  done: { bg: "#eaf5ea", tx: "#3a7a3a", lb: "Pronto!" },
}
