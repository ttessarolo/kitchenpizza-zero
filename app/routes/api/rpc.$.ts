import { createFileRoute } from '@tanstack/react-router'
import { RPCHandler } from '@orpc/server/fetch'
import { CORSPlugin } from '@orpc/server/plugins'
import { appRouter } from '~/server/router'

const handler = new RPCHandler(appRouter, {
  plugins: [new CORSPlugin()],
})

async function handleRequest({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: '/api/rpc',
    context: { request },
  })
  return response ?? new Response('Not found', { status: 404 })
}

export const Route = createFileRoute('/api/rpc/$')({
  server: {
    handlers: {
      GET: handleRequest,
      POST: handleRequest,
    },
  },
})
