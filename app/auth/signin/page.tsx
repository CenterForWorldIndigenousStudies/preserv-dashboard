import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Box, Paper, Typography } from '@mui/material'

import { getDashboardSession } from '@root/auth'

import { SignInContent } from './SignInContent'

export const dynamic = 'force-dynamic'

function SignInFallback() {
  return (
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: 'rgba(244, 241, 240, 0.2)',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100dvh',
        p: 2,
      }}
    >
      <Paper elevation={0} sx={{ boxShadow: 2, p: 4, textAlign: 'center' }}>
        <Typography color={'text.secondary'}>{'Loading...'}</Typography>
      </Paper>
    </Box>
  )
}

export default async function SignInPage() {
  const session = await getDashboardSession()

  if (session) {
    redirect('/')
  }

  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  )
}
