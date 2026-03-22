import type { RiseMethod, YeastType } from '@commons/types/recipe'

export const RISE_METHODS = [
  { key: "room", label: "Ambiente (~22°C)", tf: 1 },
  { key: "fridge", label: "Frigo (~4°C)", tf: 3.6 },
  { key: "ctrl18", label: "Controllata 18°C", tf: 1.4 },
  { key: "ctrl12", label: "Controllata 12°C", tf: 2.2 },
] as const satisfies ReadonlyArray<RiseMethod>

export const YEAST_TYPES = [
  { key: "fresh", label: "Birra fresco", toFresh: 1, speedF: 1, hasFW: false },
  { key: "dry", label: "Secco attivo", toFresh: 3, speedF: 1, hasFW: false },
  {
    key: "instant",
    label: "Istantaneo",
    toFresh: 2.5,
    speedF: 1.1,
    hasFW: false,
  },
  {
    key: "madre_s",
    label: "Madre solido",
    toFresh: 1 / 12,
    speedF: 0.3,
    hasFW: true,
  },
  {
    key: "madre_l",
    label: "Madre liquido",
    toFresh: 1 / 16,
    speedF: 0.25,
    hasFW: true,
  },
] as const satisfies ReadonlyArray<YeastType>
