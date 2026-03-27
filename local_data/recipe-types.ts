import type { RecipeTypeEntry, RecipeSubtypeEntry } from '@commons/types/recipe'

export const RECIPE_TYPES = [
  { key: "pane", labelKey: "recipe_type_pane", icon: "🍞" },
  { key: "pizza", labelKey: "recipe_type_pizza", icon: "🍕" },
  { key: "focaccia", labelKey: "recipe_type_focaccia", icon: "🫓" },
  { key: "dolce", labelKey: "recipe_type_dolce", icon: "🧁" },
  { key: "altro", labelKey: "recipe_type_altro", icon: "🥖" },
] as const satisfies ReadonlyArray<RecipeTypeEntry>

export const RECIPE_SUBTYPES: Record<string, RecipeSubtypeEntry[]> = {
  pane: [
    {
      key: "shokupan",
      labelKey: "recipe_subtype_shokupan",
      defaults: { mode: "tray", hyd: 81, thickness: 0.6, ballG: 0 },
    },
    {
      key: "pane_comune",
      labelKey: "recipe_subtype_pane_comune",
      defaults: { mode: "ball", hyd: 60, thickness: 0, ballG: 250 },
    },
    {
      key: "ciabatta",
      labelKey: "recipe_subtype_ciabatta",
      defaults: { mode: "ball", hyd: 80, thickness: 0, ballG: 300 },
    },
    {
      key: "baguette",
      labelKey: "recipe_subtype_baguette",
      defaults: { mode: "ball", hyd: 68, thickness: 0, ballG: 350 },
    },
    {
      key: "panino",
      labelKey: "recipe_subtype_panino",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 80 },
    },
    {
      key: "pane_int",
      labelKey: "recipe_subtype_pane_int",
      defaults: { mode: "ball", hyd: 70, thickness: 0, ballG: 400 },
    },
  ],
  pizza: [
    {
      key: "napoletana",
      labelKey: "recipe_subtype_napoletana",
      defaults: { mode: "ball", hyd: 64, thickness: 0, ballG: 250 },
    },
    {
      key: "romana_tonda",
      labelKey: "recipe_subtype_romana_tonda",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 200 },
    },
    {
      key: "teglia_romana",
      labelKey: "recipe_subtype_teglia_romana",
      defaults: { mode: "tray", hyd: 80, thickness: 0.5, ballG: 0 },
    },
    {
      key: "pala",
      labelKey: "recipe_subtype_pala",
      defaults: { mode: "tray", hyd: 75, thickness: 0.5, ballG: 0 },
    },
    {
      key: "pinza",
      labelKey: "recipe_subtype_pinza",
      defaults: { mode: "tray", hyd: 80, thickness: 0.7, ballG: 0 },
    },
    {
      key: "padellino",
      labelKey: "recipe_subtype_padellino",
      defaults: { mode: "ball", hyd: 70, thickness: 0, ballG: 220 },
    },
  ],
  focaccia: [
    {
      key: "genovese",
      labelKey: "recipe_subtype_genovese",
      defaults: { mode: "tray", hyd: 75, thickness: 0.5, ballG: 0 },
    },
    {
      key: "pugliese",
      labelKey: "recipe_subtype_pugliese",
      defaults: { mode: "tray", hyd: 70, thickness: 0.6, ballG: 0 },
    },
    {
      key: "messinese",
      labelKey: "recipe_subtype_messinese",
      defaults: { mode: "tray", hyd: 65, thickness: 0.7, ballG: 0 },
    },
    {
      key: "focaccia_gen",
      labelKey: "recipe_subtype_focaccia_gen",
      defaults: { mode: "tray", hyd: 70, thickness: 0.5, ballG: 0 },
    },
  ],
  dolce: [
    {
      key: "brioche",
      labelKey: "recipe_subtype_brioche",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 80 },
    },
    {
      key: "panettone",
      labelKey: "recipe_subtype_panettone",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 1000 },
    },
    {
      key: "colomba",
      labelKey: "recipe_subtype_colomba",
      defaults: { mode: "ball", hyd: 55, thickness: 0, ballG: 750 },
    },
  ],
  altro: [
    {
      key: "generico",
      labelKey: "recipe_subtype_generico",
      defaults: { mode: "tray", hyd: 65, thickness: 0.5, ballG: 0 },
    },
  ],
}
