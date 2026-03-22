import { Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) return null

  if (isSignedIn) {
    return <Redirect href="/(app)/home" />
  }

  return <Redirect href="/(auth)/sign-in" />
}
