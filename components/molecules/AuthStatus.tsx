'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@atoms/Button'

export default function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <Button loading={true} variant={`ghost`}>{`Loading...`}</Button>
  }

  if (status === 'unauthenticated') {
    return (
      <Link href="/auth/signin" className="rounded-full bg-moss px-4 py-2 text-sm text-white hover:bg-moss/90">
        {`Sign In`}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink/60">{session?.user?.email}</span>
      <Button
        onClick={() => {
          void signOut({ redirectTo: '/auth/signin' })
        }}
        variant={`ghost`}
      >
        {`Sign Out`}
      </Button>
    </div>
  )
}
