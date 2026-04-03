/**
 * useScienceCatalogs — Client-side hooks for science catalog data.
 *
 * Reads from StaticScienceProvider (Vite-bundled JSON at build time).
 * Maps science catalog shapes to the i18n-keyed types used by UI components.
 */

import { useMemo } from 'react'
import { staticProvider } from '@commons/utils/science/static-science-provider'
import type { FlourCatalogEntry, RiseMethod } from '@commons/types/recipe'

// ── Flour catalog ────────────────────────────────────────────────

export function useFlourCatalog() {
  return useMemo(() => {
    const block = staticProvider.getBlock('flours') as any
    const groups: string[] = block?.groups ?? []
    // Map science catalog entries to FlourCatalogEntry (i18n-keyed shape)
    const flours: FlourCatalogEntry[] = (block?.entries ?? []).map((e: any) => ({
      ...e,
      // Map direct-text fields to i18n key pattern
      groupKey: `flour_group_${(e.group as string ?? '').toLowerCase().replace(/\s+/g, '_')}`,
      labelKey: `flour_${e.key}`,
      subKey: `flour_${e.key}_sub`,
    }))
    // Derive group keys
    const flourGroups = groups.map((g: string) => ({
      key: `flour_group_${g.toLowerCase().replace(/\s+/g, '_')}`,
      label: g,
    }))
    return { flours, groups: flourGroups }
  }, [])
}

// ── Rise methods ─────────────────────────────────────────────────

export function useRiseMethods() {
  return useMemo(() => {
    const catalog = staticProvider.getCatalog('rise_methods') as any[]
    return catalog.map((e) => ({
      ...e,
      labelKey: `rise_${e.key}`,
    })) as RiseMethod[]
  }, [])
}

// ── Yeast types ──────────────────────────────────────────────────

export interface YeastTypeEntry {
  key: string
  labelKey: string
  toFresh: number
  speedF: number
  hasFW: boolean
}

export function useYeastTypes(): YeastTypeEntry[] {
  return useMemo(() => {
    const block = staticProvider.getBlock('rise_methods') as any
    const yeastTypes: any[] = block?.yeastTypes ?? []
    return yeastTypes.map((y) => ({
      key: y.key,
      labelKey: `yeast_${y.key}`,
      toFresh: y.toFresh,
      speedF: y.speedF,
      hasFW: y.hasFW ?? false,
    }))
  }, [])
}

// ── Fat types ────────────────────────────────────────────────────

export interface FatTypeEntry {
  key: string
  labelKey: string
  fryable: boolean
  smokePoint?: number
  fermentEffect?: number
}

export function useFatTypes(): FatTypeEntry[] {
  return useMemo(() => {
    const catalog = staticProvider.getCatalog('fats') as any[]
    return catalog.map((f) => ({
      ...f,
      labelKey: `fat_${f.key}`,
    }))
  }, [])
}

// ── Baking profiles ──────────────────────────────────────────────

export function useBakingProfiles() {
  return useMemo(
    () => staticProvider.getCatalog('baking_profiles') as any[],
    [],
  )
}
