import type { RiseMethod, YeastType } from '@commons/types/recipe'

export const RISE_METHODS = [
  { key: "room", labelKey: "rise_room", tf: 1 },
  { key: "fridge", labelKey: "rise_fridge", tf: 3.6 },
  { key: "ctrl18", labelKey: "rise_ctrl18", tf: 1.4 },
  { key: "ctrl12", labelKey: "rise_ctrl12", tf: 2.2 },
] as const satisfies ReadonlyArray<RiseMethod>

export const YEAST_TYPES = [
  { key: "fresh", labelKey: "yeast_fresh", toFresh: 1, speedF: 1, hasFW: false },
  { key: "dry", labelKey: "yeast_dry", toFresh: 3, speedF: 1, hasFW: false },
  {
    key: "instant",
    labelKey: "yeast_instant",
    toFresh: 2.5,
    speedF: 1.1,
    hasFW: false,
  },
  {
    key: "madre_s",
    labelKey: "yeast_madre_s",
    toFresh: 1 / 12,
    speedF: 0.3,
    hasFW: true,
  },
  {
    key: "madre_l",
    labelKey: "yeast_madre_l",
    toFresh: 1 / 16,
    speedF: 0.25,
    hasFW: true,
  },
] as const satisfies ReadonlyArray<YeastType>
