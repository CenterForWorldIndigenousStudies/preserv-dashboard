'use client'

import { Alert, Box, Paper, Stack, Typography } from '@mui/material'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@atoms/Button'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

function GoogleIcon(): React.ReactElement {
  return (
    <Box component={'svg'} viewBox={'0 0 24 24'} sx={{ height: 20, width: 20 }} aria-hidden={'true'}>
      <path
        fill={'#4285F4'}
        d={
          'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
        }
      />
      <path
        fill={'#34A853'}
        d={
          'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
        }
      />
      <path
        fill={'#FBBC05'}
        d={
          'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
        }
      />
      <path
        fill={'#EA4335'}
        d={
          'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
        }
      />
    </Box>
  )
}

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
            startIcon={<GoogleIcon />}
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
