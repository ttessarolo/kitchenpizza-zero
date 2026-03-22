import { createFileRoute } from '@tanstack/react-router'
import { verifyWebhook } from '@clerk/tanstack-react-start/webhooks'
import { createUser, updateUser, deleteUser } from '~/server/user'
import type { UserJSON } from '@clerk/backend'

export const Route = createFileRoute('/api/webhooks/clerk')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const evt = await verifyWebhook(request)

          const { id } = evt.data
          const eventType = evt.type
          console.log(
            `Received webhook with ID ${id} and event type of ${eventType}`,
          )

          if (!evt.data) {
            throw new Error('Data is required')
          }

          if (eventType.startsWith('user.') && 'id' in evt.data) {
            const userData = evt.data as UserJSON

            const data = {
              id: userData.id,
              username: userData.username ?? '',
              email_address:
                userData.email_addresses?.[0]?.email_address ?? '',
              first_name: userData.first_name ?? '',
              last_name: userData.last_name ?? '',
              image_url: userData.image_url ?? '',
            }

            switch (eventType) {
              case 'user.created':
                await createUser({ data })
                break
              case 'user.updated':
                await updateUser({ data })
                break
              case 'user.deleted':
                await deleteUser({ data: { userId: evt.data.id ?? '' } })
                break
            }
          }

          return new Response('Webhook received', { status: 200 })
        } catch (err) {
          console.error('Error verifying webhook:', err)
          return new Response('Error verifying webhook', { status: 400 })
        }
      },
    },
  },
})
