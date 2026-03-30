/**
 * Layer templates — starter node sequences for new layers.
 *
 * Maps (layerType:subtype:variant) or (layerType:subtype) or (layerType)
 * to a template definition. For impasto, delegates to generateDoughGraph().
 * Other layer types will get declarative templates in the future.
 */

import type { LayerType } from '../types/recipe-layers'

// ── Template types ──────────────────────────────────────────────

export interface TemplateNodeDef {
  type: string           // NodeTypeKey
  subtype?: string | null
  titleKey: string       // i18n key
  baseDur: number
}

export interface TemplateEdgeDef {
  fromIndex: number      // index into nodes array
  toIndex: number
}

export interface LayerTemplate {
  nodes: TemplateNodeDef[]
  edges: TemplateEdgeDef[]
}

/** Sentinel: delegate to generateDoughGraph() */
export interface GeneratorSentinel {
  useGenerator: 'impasto'
}

export type TemplateEntry = LayerTemplate | GeneratorSentinel

export function isGeneratorSentinel(entry: TemplateEntry): entry is GeneratorSentinel {
  return 'useGenerator' in entry
}

// ── Template registry ───────────────────────────────────────────

const LAYER_TEMPLATES: Record<string, TemplateEntry> = {
  // All impasto entries delegate to the procedural generator
  'impasto': { useGenerator: 'impasto' },
}

// ── Lookup ──────────────────────────────────────────────────────

/**
 * Resolve a template for the given layer type/subtype/variant.
 * Checks most-specific key first, then falls back.
 * Returns null if no template exists (layer starts empty).
 */
export function resolveTemplate(
  type: LayerType,
  subtype: string,
  variant: string,
): TemplateEntry | null {
  return (
    LAYER_TEMPLATES[`${type}:${subtype}:${variant}`] ??
    LAYER_TEMPLATES[`${type}:${subtype}`] ??
    LAYER_TEMPLATES[type] ??
    null
  )
}
