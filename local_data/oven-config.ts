import type { OvenTypeEntry, OvenModeEntry } from '@commons/types/recipe'

export const OVEN_TYPES = [
  { key: "electric", label: "Elettrico" },
  { key: "gas", label: "Gas" },
  { key: "wood", label: "Legna" },
] as const satisfies ReadonlyArray<OvenTypeEntry>

export const OVEN_MODES = [
  { key: "static", label: "Statico" },
  { key: "fan", label: "Ventilato" },
  { key: "steam", label: "Vapore" },
] as const satisfies ReadonlyArray<OvenModeEntry>

export const MODE_MAP: Record<string, string[]> = {
  electric: ["static", "fan", "steam"],
  gas: ["static", "fan"],
  wood: ["static"],
}
