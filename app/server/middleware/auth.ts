import { os } from '@orpc/server'
import { createClerkClient } from '@clerk/backend'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export const baseProcedure = os

export const authProcedure = baseProcedure.use(async (options) => {
  const request = (options.context as Record<string, unknown>).request as Request | undefined
  let userId: string | null = null

  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const result = await clerkClient.authenticateRequest(request)
        userId = result.toAuth()?.userId ?? null
      } catch {
        // Token verification failed
      }
    }
  }

  if (!userId) {
    throw new Error('UNAUTHORIZED: Authentication required')
  }

  return options.next({ context: { userId } })
})
