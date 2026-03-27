import type { KneadMethod } from '@commons/types/recipe'

export const KNEAD_METHODS = [
  { key: "hand", labelKey: "knead_hand", ff: 3 },
  { key: "stand", labelKey: "knead_stand", ff: 12 },
  { key: "spiral", labelKey: "knead_spiral", ff: 8 },
] as const satisfies ReadonlyArray<KneadMethod>
