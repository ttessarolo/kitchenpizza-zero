import { sql } from '~/lib/db'

export const healthService = {
  async check() {
    try {
      await sql`SELECT 1`
      return { status: 'ok', timestamp: new Date().toISOString() }
    } catch {
      return { status: 'error', timestamp: new Date().toISOString() }
    }
  },
}
