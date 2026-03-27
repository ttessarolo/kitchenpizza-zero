/**
 * Transitional helper — re-attaches resolved `label` to rows with `labelKey`.
 * Use during migration; remove when all consumers use t(labelKey) directly.
 */
export function withLabels<T extends { labelKey: string }>(
  rows: readonly T[],
  t: (key: string) => string,
): (T & { label: string })[] {
  return rows.map((r) => ({ ...r, label: t(r.labelKey) }))
}
