import type { ReactElement, ReactNode } from 'react'

interface SessionProviderProps {
  children: ReactNode
  session?: unknown
}

interface StorybookSession {
  data: null
  status: 'unauthenticated'
  update: () => Promise<null>
}

interface StorybookAuthInstance {
  auth: () => Promise<null>
  handlers: Record<string, never>
  signIn: () => Promise<undefined>
  signOut: () => Promise<undefined>
}

export function SessionProvider({ children }: SessionProviderProps): ReactElement {
  return <>{children}</>
}

export function useSession(): StorybookSession {
  return {
    data: null,
    status: 'unauthenticated',
    update: () => Promise.resolve(null),
  }
}

export function signIn(): Promise<undefined> {
  return Promise.resolve(undefined)
}

export function signOut(): Promise<undefined> {
  return Promise.resolve(undefined)
}

export default function NextAuth(): StorybookAuthInstance {
  return {
    auth: () => Promise.resolve(null),
    handlers: {},
    signIn,
    signOut,
  }
}
