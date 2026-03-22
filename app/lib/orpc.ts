import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createRouterClient } from '@orpc/server'
import { createIsomorphicFn } from '@tanstack/react-start'
import { createORPCReactQueryUtils } from '@orpc/react-query'
import type { AppRouter } from '~/server/router'

const client = createIsomorphicFn()
  .server(async () => {
    const { appRouter } = await import('~/server/router')
    return createRouterClient(appRouter, {
      context: async () => ({}),
    })
  })
  .client(() => {
    return createORPCClient<AppRouter>(
      new RPCLink({
        url: '/api/rpc',
      }),
    )
  })

export const orpc = createORPCReactQueryUtils(client as any)
