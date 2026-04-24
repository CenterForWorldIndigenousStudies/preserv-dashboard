'use client'

import NextLink from 'next/link'
import { useSession, signOut } from 'next-auth/react'

import { Button } from '@atoms/Button'

export default function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <Button loading={true} variant={`ghost`}>{'Loading...'}</Button>
  }

  if (status === 'unauthenticated') {
    return (
      <Button component={NextLink} href={`/auth/signin`}>
        {'Sign In'}
      </Button>
    )
  }

  return (
    <div className={`flex items-center gap-3`}>
      <span className={`text-xs text-ink/60`}>{session?.user?.email}</span>
      <Button
        onClick={() => {
          void signOut({ redirectTo: '/auth/signin' })
        }}
        variant={`ghost`}
      >
        {'Sign Out'}
      </Button>
    </div>
  )
}
