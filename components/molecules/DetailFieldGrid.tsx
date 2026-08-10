import type { ReactElement, ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

export interface DetailField {
  key: string
  label: string
  value: ReactNode
}

interface DetailFieldGridProps {
  fields: readonly DetailField[]
}

export function DetailFieldGrid({ fields }: DetailFieldGridProps): ReactElement {
  return (
    <Box
      component={'dl'}
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        m: 0,
        mt: 1,
      }}
    >
      {fields.map((field) => (
        <Box key={field.key} component={'div'} sx={{ bgcolor: 'rgba(244, 241, 240, 0.45)', borderRadius: 3, p: 2 }}>
          <Typography
            component={'dt'}
            variant={'caption'}
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            {field.label}
          </Typography>
          <Box component={'dd'} sx={{ color: 'text.primary', mt: 1, overflowWrap: 'anywhere', m: 0 }}>
            {field.value}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
