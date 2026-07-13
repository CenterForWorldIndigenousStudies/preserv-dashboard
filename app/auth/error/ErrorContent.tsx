'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Box, Paper, Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import { SIGNIN_PATH } from '@constants/paths'

export function ErrorContent() {
  const params = useSearchParams()
  const error = params.get('error')

  const errorMessages: Record<string, string> = {
    OAuthSignin: 'Error starting the sign-in process.',
    OAuthCallback: 'Error during the sign-in callback.',
    OAuthAccountNotLinked: 'This email is already linked to a different sign-in method.',
    OAuthCreateAccount: 'Could not create an account. Contact your administrator.',
    Callback: 'Callback error. Please try again.',
    Default: 'An unknown error occurred.',
  }

  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <Box
      sx={{
        alignItems: 'center',
        bgcolor: 'rgba(244, 241, 240, 0.2)',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100dvh',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        component="section"
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 2,
          maxWidth: 448,
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          width: '100%',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              alignItems: 'center',
              bgcolor: 'rgba(233, 105, 84, 0.08)',
              borderRadius: '50%',
              color: 'clay.main',
              display: 'flex',
              height: 64,
              justifyContent: 'center',
              width: 64,
            }}
          >
            <AlertTriangle aria-hidden="true" size={32} strokeWidth={1.5} />
          </Box>
          <Stack spacing={1}>
            <Typography component="h1" variant="h4" sx={{ color: 'ink.main' }}>
              Sign In Error
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {message}
            </Typography>
          </Stack>
          <Stack spacing={1.5} sx={{ width: '100%' }}>
            <Button component={Link} href={SIGNIN_PATH} fullWidth>
              Try Again
            </Button>
            <Button component={Link} href="/" variant="secondary" fullWidth>
              Return Home
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
