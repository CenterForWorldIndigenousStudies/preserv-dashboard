import type { ReactElement, ReactNode } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'

interface DetailPageSectionProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function DetailPageSection({ title, description, actions, children }: DetailPageSectionProps): ReactElement {
  return (
    <Paper
      component={'section'}
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'rgba(53, 88, 52, 0.15)',
        boxShadow: 2,
        p: { xs: 2.5, md: 3 },
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'stretch', md: 'flex-start' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography component={'h2'} variant={'h5'} color={'text.primary'}>
              {title}
            </Typography>
            {description ? (
              <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 1 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {actions}
        </Stack>
        {children}
      </Stack>
    </Paper>
  )
}
