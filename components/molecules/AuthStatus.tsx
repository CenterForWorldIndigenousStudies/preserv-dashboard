'use client'

import NextLink from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Stack, Typography } from '@mui/material'
import { SIGNIN_PATH } from '@constants/paths'

import { Button } from '@atoms/Button'

export default function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <Button loading={true} variant={`ghost`}>
        {'Loading...'}
      </Button>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Button component={NextLink} href={SIGNIN_PATH}>
        {'Sign In'}
      </Button>
    )
  }

  return (
    <Stack direction={'row'} spacing={1.5} sx={{ alignItems: 'center' }}>
      <Typography variant={'caption'} sx={{ color: 'text.secondary' }}>
        {session?.user?.email}
      </Typography>
      <Button
        onClick={() => {
          void signOut({ redirectTo: SIGNIN_PATH })
        }}
        variant={`ghost`}
      >
        {'Sign Out'}
      </Button>
    </Stack>
  )
}
