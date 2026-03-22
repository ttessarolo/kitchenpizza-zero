import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import { setTokenGetter } from './orpc'

export function ORPCProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()

  useEffect(() => {
    setTokenGetter(getToken)
  }, [getToken])

  return <>{children}</>
}
