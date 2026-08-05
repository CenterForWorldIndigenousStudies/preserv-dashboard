import type { ReactElement } from 'react'

import { Paper, Stack, Typography } from '@mui/material'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps): ReactElement {
  return (
    <Paper
      component="header"
      elevation={0}
      sx={{
        backgroundColor: 'var(--cwis-surface-inverse)',
        borderRadius: 2,
        boxShadow: 3,
        color: 'var(--cwis-text-inverse)',
        px: { xs: 3, md: 4 },
        py: { xs: 4, md: 5 },
      }}
    >
      <Stack spacing={2}>
        <Typography component="p" variant="overline" sx={{ color: 'info.main', letterSpacing: '0.3em' }}>
          {eyebrow}
        </Typography>
        <Typography
          component="h1"
          variant="h3"
          sx={{
            color: 'common.white',
            fontSize: { xs: '1.875rem', md: '2.25rem' },
            fontWeight: 600,
          }}
        >
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'info.main', maxWidth: '42rem', lineHeight: 1.5 }}>
          {description}
        </Typography>
      </Stack>
    </Paper>
  )
}
