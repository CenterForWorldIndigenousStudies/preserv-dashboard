'use client'

import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import ThemeProvider from './ThemeProvider'

export default function Providers({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  )
}
