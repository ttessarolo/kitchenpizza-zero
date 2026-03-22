import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'
import type { AppRouter } from '../../app/server/router'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'

let getToken: (() => Promise<string | null>) | null = null

export function setTokenGetter(fn: () => Promise<string | null>) {
  getToken = fn
}

const link = new RPCLink({
  url: `${API_BASE_URL}/api/rpc`,
  headers: async () => {
    const token = await getToken?.()
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
})

const client = createORPCClient<AppRouter>(link)

export const orpc = createORPCReactQueryUtils(client)
