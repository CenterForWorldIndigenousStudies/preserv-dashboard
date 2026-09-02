import type { ReactElement } from 'react'
import { Box, Typography } from '@mui/material'

interface ProcessDetailRowProps {
  label: string
  value: string
}

export function ProcessDetailRow({ label, value }: ProcessDetailRowProps): ReactElement {
  return (
    <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
      <Box component={'span'} sx={{ color: 'text.primary', fontWeight: 600 }}>
        {label}:
      </Box>{' '}
      {value}
    </Typography>
  )
}
