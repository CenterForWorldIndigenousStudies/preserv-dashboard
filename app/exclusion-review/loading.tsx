import type { ReactElement } from 'react'
import { Stack, Typography } from '@mui/material'

export default function ExclusionReviewLoading(): ReactElement {
  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Typography variant={'h5'}>Loading exclusion review…</Typography>
      <Typography color={'text.secondary'}>{'Preparing the configured Drive root for review.'}</Typography>
    </Stack>
  )
}
