import type { FlourCatalogEntry } from '@commons/types/recipe'

export const FLOUR_CATALOG = [
  // ── Grano Tenero ──────────────────────────────────────────
  { key: "gt_00_deb", group: "Grano Tenero", label: "00 debole", sub: "W 90-170", protein: 9, W: 130, PL: 0.45, absorption: 52, ash: 0.5, fiber: 2, starchDamage: 6, fermentSpeed: 1.25, fallingNumber: 280 },
  { key: "gt_00_med", group: "Grano Tenero", label: "00 media", sub: "W 180-250", protein: 10.5, W: 215, PL: 0.55, absorption: 56, ash: 0.52, fiber: 2.2, starchDamage: 6.5, fermentSpeed: 1.1, fallingNumber: 300 },
  { key: "gt_00_for", group: "Grano Tenero", label: "00 forte", sub: "W 260-320", protein: 12, W: 290, PL: 0.55, absorption: 58, ash: 0.55, fiber: 2.2, starchDamage: 7, fermentSpeed: 1, fallingNumber: 340 },
  { key: "gt_0_deb", group: "Grano Tenero", label: "0 debole", sub: "W 150-200", protein: 11, W: 175, PL: 0.5, absorption: 57, ash: 0.6, fiber: 2.8, starchDamage: 7, fermentSpeed: 1.15, fallingNumber: 290 },
  { key: "gt_0_med", group: "Grano Tenero", label: "0 media", sub: "W 200-280", protein: 11.5, W: 240, PL: 0.55, absorption: 60, ash: 0.62, fiber: 2.9, starchDamage: 7.5, fermentSpeed: 1.05, fallingNumber: 310 },
  { key: "gt_0_for", group: "Grano Tenero", label: "0 forte", sub: "W 280-350", protein: 13, W: 315, PL: 0.55, absorption: 63, ash: 0.65, fiber: 3, starchDamage: 8, fermentSpeed: 1, fallingNumber: 350 },
  { key: "gt_1", group: "Grano Tenero", label: "Tipo 1", sub: "W 180-350", protein: 12, W: 260, PL: 0.6, absorption: 65, ash: 0.75, fiber: 4, starchDamage: 7.5, fermentSpeed: 1.05, fallingNumber: 310 },
  { key: "gt_2", group: "Grano Tenero", label: "Tipo 2", sub: "semi-int.", protein: 12, W: 260, PL: 0.65, absorption: 66, ash: 0.9, fiber: 6.5, starchDamage: 7, fermentSpeed: 1.08, fallingNumber: 290 },
  { key: "gt_int", group: "Grano Tenero", label: "Integrale", sub: "W 280-300", protein: 12, W: 290, PL: 0.7, absorption: 70, ash: 1.5, fiber: 9, starchDamage: 6.5, fermentSpeed: 1.1, fallingNumber: 270 },
  { key: "gt_manit", group: "Grano Tenero", label: "Manitoba", sub: "W 350-420", protein: 14, W: 380, PL: 0.55, absorption: 65, ash: 0.55, fiber: 2.5, starchDamage: 8, fermentSpeed: 0.9, fallingNumber: 380 },
  // ── Grano Duro ────────────────────────────────────────────
  { key: "gd_sem", group: "Grano Duro", label: "Semola", sub: "granulare", protein: 12.5, W: 200, PL: 1.8, absorption: 62, ash: 0.85, fiber: 3.5, starchDamage: 9, fermentSpeed: 0.85, fallingNumber: 400 },
  { key: "gd_rim", group: "Grano Duro", label: "Semola rim.", sub: "fine", protein: 12, W: 190, PL: 1.6, absorption: 60, ash: 0.8, fiber: 3, starchDamage: 10, fermentSpeed: 0.88, fallingNumber: 390 },
  { key: "gd_int", group: "Grano Duro", label: "Semola int.", sub: "integrale", protein: 13, W: 220, PL: 2, absorption: 68, ash: 1.6, fiber: 10, starchDamage: 8, fermentSpeed: 0.82, fallingNumber: 360 },
  // ── Speciali ──────────────────────────────────────────────
  { key: "sp_farro_m", group: "Speciali", label: "Farro monoc.", sub: "antico", protein: 14, W: 100, PL: 0.4, absorption: 58, ash: 0.8, fiber: 5, starchDamage: 5, fermentSpeed: 1.2, fallingNumber: 320 },
  { key: "sp_farro_d", group: "Speciali", label: "Farro dicoc.", sub: "emmer", protein: 13, W: 150, PL: 0.5, absorption: 60, ash: 0.85, fiber: 6, starchDamage: 6, fermentSpeed: 1.15, fallingNumber: 310 },
  { key: "sp_farro_s", group: "Speciali", label: "Farro spelta", sub: "", protein: 12, W: 130, PL: 0.55, absorption: 58, ash: 0.9, fiber: 7, starchDamage: 6, fermentSpeed: 1.18, fallingNumber: 300 },
  { key: "sp_avena", group: "Speciali", label: "Avena", sub: "", protein: 13, W: 80, PL: 0.35, absorption: 65, ash: 1.8, fiber: 10, starchDamage: 5, fermentSpeed: 1, fallingNumber: 300 },
  { key: "sp_segale", group: "Speciali", label: "Segale", sub: "", protein: 9, W: 60, PL: 0.3, absorption: 68, ash: 1.5, fiber: 12, starchDamage: 5, fermentSpeed: 1.3, fallingNumber: 180 },
  { key: "sp_sarac", group: "Speciali", label: "Grano sarac.", sub: "senza glutine", protein: 12, W: 0, PL: 0, absorption: 60, ash: 2, fiber: 4, starchDamage: 4, fermentSpeed: 0, fallingNumber: 300 },
  { key: "sp_riso", group: "Speciali", label: "Riso", sub: "senza glutine", protein: 6, W: 0, PL: 0, absorption: 50, ash: 0.5, fiber: 1, starchDamage: 5, fermentSpeed: 0, fallingNumber: 300 },
  { key: "sp_kamut", group: "Speciali", label: "Kamut", sub: "antico", protein: 14, W: 200, PL: 0.6, absorption: 60, ash: 0.9, fiber: 5, starchDamage: 6, fermentSpeed: 1.05, fallingNumber: 340 },
  { key: "sp_teff", group: "Speciali", label: "Teff", sub: "senza glutine", protein: 11, W: 0, PL: 0, absorption: 65, ash: 2.5, fiber: 8, starchDamage: 4, fermentSpeed: 0, fallingNumber: 300 },
] as const satisfies ReadonlyArray<FlourCatalogEntry>

export const FLOUR_GROUPS = ["Grano Tenero", "Grano Duro", "Speciali"] as const
