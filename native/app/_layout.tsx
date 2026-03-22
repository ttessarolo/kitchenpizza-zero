import { Slot } from 'expo-router'
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo'
import { tokenCache } from '../lib/clerk-token-cache'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ORPCProvider } from '../lib/orpc-context'
import * as Sentry from '@sentry/react-native'
import {
  useFonts,
  Lato_100Thin,
  Lato_300Light,
  Lato_400Regular,
  Lato_700Bold,
  Lato_900Black,
} from '@expo-google-fonts/lato'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
})

const queryClient = new QueryClient()

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lato_100Thin,
    Lato_300Light,
    Lato_400Regular,
    Lato_700Bold,
    Lato_900Black,
  })

  if (!fontsLoaded) return null

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <ORPCProvider>
            <Slot />
          </ORPCProvider>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  )
}

export default Sentry.wrap(RootLayout)
