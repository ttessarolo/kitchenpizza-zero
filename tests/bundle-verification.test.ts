/**
 * Bundle Verification Tests — verify that client-side code does NOT
 * contain forbidden imports (science managers, static provider, science JSON).
 *
 * The architecture mandates thin-client: all science computation is server-side
 * via oRPC. These tests enforce that boundary.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

const CLIENT_DIR = resolve(process.cwd(), 'app')

/** Recursively find all .ts/.tsx files in a directory, excluding node_modules and server/. */
function getAllTsFiles(dir: string): string[] {
  const results: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    // Skip node_modules and server directories
    if (entry === 'node_modules' || entry === 'server') continue
    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      results.push(...getAllTsFiles(fullPath))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      results.push(fullPath)
    }
  }
  return results
}

describe('Bundle verification — no forbidden client imports', () => {
  const clientFiles = getAllTsFiles(CLIENT_DIR)

  it('found client files to check', () => {
    expect(clientFiles.length).toBeGreaterThan(0)
  })

  it('only approved client files import staticProvider', () => {
    // These files legitimately need staticProvider for client-side calculations
    // (baking duration, dough temp) that run in the browser
    const ALLOWED = [
      'hooks/useRecipeCalculator.ts',
      'hooks/useScienceCatalogs.ts',
      'hooks/useDomainMeta.ts',
      'stores/recipe-flow-store.ts',
      'lib/generate-dough.ts',
      'lib/generate-layer-graph.ts',
    ]
    for (const file of clientFiles) {
      const content = readFileSync(file, 'utf-8')
      if (content.includes('static-science-provider')) {
        const isAllowed = ALLOWED.some((a) => file.includes(a))
        expect(isAllowed, `Unexpected staticProvider import in ${file}`).toBe(true)
      }
    }
  })

  it('no client file imports from @commons/utils/*-manager', () => {
    for (const file of clientFiles) {
      const content = readFileSync(file, 'utf-8')
      const managerImports = content.match(
        /from\s+['"]@commons\/utils\/[^'"]*-manager['"]/g,
      )
      expect(managerImports).toBeNull()
    }
  })

  it('no client file imports science JSON directly', () => {
    for (const file of clientFiles) {
      const content = readFileSync(file, 'utf-8')
      expect(content).not.toMatch(
        /from\s+['"][^'"]*\/science\/[^'"]*\.json['"]/,
      )
    }
  })
})
