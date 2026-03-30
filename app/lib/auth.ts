import { auth } from '@clerk/tanstack-react-start/server'

export async function getAuth() {
  return await auth()
}

export function hasRole(
  sessionClaims: Record<string, unknown> | undefined,
  role: string,
): boolean {
  // Check multiple paths where Clerk may expose roles:
  // 1. sessionClaims.roles (custom JWT template)
  // 2. sessionClaims.public_metadata.roles (default Clerk structure)
  // 3. sessionClaims.metadata.roles (alternative path)
  const directRoles = (sessionClaims?.roles as string[]) ?? []
  const pubMeta = (sessionClaims?.public_metadata ?? sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>
  const metaRoles = (pubMeta?.roles as string[]) ?? []
  const meta = (sessionClaims?.metadata ?? {}) as Record<string, unknown>
  const metaRoles2 = (meta?.roles as string[]) ?? []

  return directRoles.includes(role) || metaRoles.includes(role) || metaRoles2.includes(role)
}

export function isAdmin(
  sessionClaims: Record<string, unknown> | undefined,
): boolean {
  return hasRole(sessionClaims, 'admin')
}
