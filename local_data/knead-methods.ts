import type { KneadMethod } from '@commons/types/recipe'

export const KNEAD_METHODS = [
  { key: "hand", label: "A mano", ff: 3 },
  { key: "stand", label: "Planetaria", ff: 12 },
  { key: "spiral", label: "Spirale", ff: 8 },
] as const satisfies ReadonlyArray<KneadMethod>
