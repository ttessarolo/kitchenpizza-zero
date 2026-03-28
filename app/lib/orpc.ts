import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createRouterClient } from '@orpc/server'
import { createIsomorphicFn } from '@tanstack/react-start'
import { createORPCReactQueryUtils } from '@orpc/react-query'

const client = createIsomorphicFn()
  .server(async () => {
    const { appRouter } = await import('~/server/router')
    return createRouterClient(appRouter, {
      context: async () => ({}),
    })
  })
  .client(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createORPCClient<any>(
      new RPCLink({
        url: '/api/rpc',
      }),
    )
  })

export const orpc = createORPCReactQueryUtils(client as any)
