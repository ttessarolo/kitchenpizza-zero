import type { OvenTypeEntry, OvenModeEntry } from '@commons/types/recipe'

export const OVEN_TYPES = [
  { key: "electric", labelKey: "oven_type_electric" },
  { key: "gas", labelKey: "oven_type_gas" },
  { key: "wood", labelKey: "oven_type_wood" },
] as const satisfies ReadonlyArray<OvenTypeEntry>

export const OVEN_MODES = [
  { key: "static", labelKey: "oven_mode_static" },
  { key: "fan", labelKey: "oven_mode_fan" },
  { key: "steam", labelKey: "oven_mode_steam" },
] as const satisfies ReadonlyArray<OvenModeEntry>

export const MODE_MAP: Record<string, string[]> = {
  electric: ["static", "fan", "steam"],
  gas: ["static", "fan"],
  wood: ["static"],
}
