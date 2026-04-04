/**
 * useDomainMeta — Client-side hook for domain-aware layer type metadata.
 *
 * Reads from StaticScienceProvider (Vite-bundled domains.json) and builds
 * LayerTypeMeta overlaying DB-driven values on static defaults.
 */

import { useMemo } from 'react'
import { staticProvider } from '@commons/utils/science/static-science-provider'
import {
  LAYER_TYPE_META,
  LAYER_TYPES,
  buildLayerTypeMeta,
  type LayerTypeMeta,
} from '@commons/constants/layer-defaults'
import type { LayerType } from '@commons/types/recipe-layers'
import type { DomainInfo } from '@commons/utils/science/types'

export interface DomainMetaResult {
  /** Layer type meta (DB-enriched, fallback to static) */
  meta: Record<LayerType, LayerTypeMeta>
  /** Ordered list of active layer types */
  types: readonly LayerType[]
  /** Domain info array (for persona, system prompts, etc.) */
  domains: DomainInfo[]
}

export function useDomainMeta(): DomainMetaResult {
  return useMemo(() => {
    const domains = staticProvider.getDomains()

    if (domains.length === 0) {
      return { meta: LAYER_TYPE_META, types: LAYER_TYPES, domains: [] }
    }

    const meta = buildLayerTypeMeta(domains)

    // Order types by DB sortOrder, filtering to only active persona domains
    const domainKeys = new Set(domains.map(d => d.key))
    const types = LAYER_TYPES.filter(t => domainKeys.has(t))

    return { meta, types, domains }
  }, [])
}
