import { Suspense } from 'react'
import { Box, Paper, Typography } from '@mui/material'

import { ErrorContent } from './ErrorContent'

export const dynamic = 'force-dynamic'

function ErrorFallback() {
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

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<ErrorFallback />}>
      <ErrorContent />
    </Suspense>
  )
}
