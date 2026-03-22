import { auth } from '@clerk/tanstack-react-start/server'

export async function getAuth() {
  return await auth()
}

export function hasRole(
  sessionClaims: Record<string, unknown> | undefined,
  role: string,
): boolean {
  const roles = (sessionClaims?.roles as string[]) ?? []
  return roles.includes(role)
}

export function isAdmin(
  sessionClaims: Record<string, unknown> | undefined,
): boolean {
  return hasRole(sessionClaims, 'admin')
}
