/**
 * i18n helper — Resolves message keys to localized text with variable interpolation.
 *
 * Template syntax: {{variableName}} for interpolation.
 * Fallback: if key not found in target locale, falls back to 'en'.
 */

export type I18nData = Record<string, string>

/**
 * Resolve a message key to localized text, interpolating variables.
 *
 * @param key — i18n key (e.g., "advisory.steam_too_long")
 * @param vars — variables for interpolation (e.g., { steamPct: 100, baseDur: 40 })
 * @param localeData — current locale translations
 * @param fallbackData — fallback locale translations (usually 'en')
 * @returns resolved text, or the key itself if not found
 */
export function resolveMessage(
  key: string,
  vars: Record<string, unknown>,
  localeData: I18nData,
  fallbackData?: I18nData,
): string {
  const template = localeData[key] ?? fallbackData?.[key] ?? key

  // Interpolate {{variableName}} patterns
  return template.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    const value = vars[varName]
    return value !== undefined && value !== null ? String(value) : ''
  })
}
