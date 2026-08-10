'use client'

import { Alert, Box, Paper, Stack, Typography } from '@mui/material'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@atoms/Button'
import { IconGoogle } from '@atoms/icons/IconGoogle'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export function SignInContent() {
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/'
  const error = params.get('error')

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
        component={'section'}
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
              bgcolor: 'rgba(53, 88, 52, 0.08)',
              borderRadius: '50%',
              color: 'primary.main',
              display: 'flex',
              height: 64,
              justifyContent: 'center',
              width: 64,
            }}
          >
            <ShieldCheck aria-hidden={'true'} size={32} strokeWidth={1.5} />
          </Box>
          <Stack spacing={1}>
            <Typography component={'h1'} variant={'h4'} sx={{ color: 'text.primary' }}>
              {'Sign in to CWIS Preservation'}
            </Typography>
            <Typography variant={'body2'} color={'text.secondary'}>
              {'Use your CWIS Google account to continue'}
            </Typography>
          </Stack>

          {error ? (
            <Alert severity={'error'} sx={{ textAlign: 'left', width: '100%' }}>
              {error === 'OAuthAccountNotLinked'
                ? 'This email is already linked to a different sign-in method.'
                : 'An error occurred during sign in. Please try again.'}
            </Alert>
          ) : null}

          <Button
            onClick={() => {
              void signIn('google', { redirectTo: callbackUrl })
            }}
            startIcon={<IconGoogle />}
            variant={'secondary'}
            fullWidth
          >
            {'Sign in with Google'}
          </Button>

          <Typography variant={'caption'} color={'text.disabled'}>
            {'Access is restricted to CWIS team members.'}
            <br />
            {'Contact your administrator if you need access.'}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}
