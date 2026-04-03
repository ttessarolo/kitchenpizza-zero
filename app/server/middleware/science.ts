/**
 * Science middleware — lazy singleton for ScienceProvider.
 *
 * Uses DbScienceProvider (Neon) when NEON_CSB_DATABASE_URL is set.
 * Falls back to FileScienceProvider for local dev without DB.
 */

import type { ScienceProvider } from '@commons/utils/science/science-provider'

let provider: ScienceProvider | null = null
let initPromise: Promise<ScienceProvider> | null = null

export async function getScienceProvider(): Promise<ScienceProvider> {
  if (provider) return provider

  // Deduplicate concurrent init calls
  if (!initPromise) {
    initPromise = (async () => {
      if (process.env.NEON_CSB_DATABASE_URL) {
        const { DbScienceProvider } = await import('@commons/utils/science/db-science-provider')
        const p = new DbScienceProvider(process.env.NEON_CSB_DATABASE_URL)
        await p.init()
        provider = p
        return p
      }
      // Fallback: file-based provider for local dev
      const { resolve } = await import('path')
      const { FileScienceProvider } = await import('@commons/utils/science/science-provider')
      const p = new FileScienceProvider(
        resolve(process.cwd(), 'science'),
        resolve(process.cwd(), 'commons/i18n'),
      )
      provider = p
      return p
    })()
  }

  return initPromise
}
