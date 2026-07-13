import type { ReactElement } from 'react'

import { Paper, Stack, Typography } from '@mui/material'

interface NoDataStateProps {
  title?: string
  message: string
}

export function NoDataState({ title = 'No Data', message }: NoDataStateProps): ReactElement {
  return (
    <Paper
      component="section"
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'moss.main',
        backgroundColor: 'background.paper',
        boxShadow: 2,
        p: 4,
      }}
    >
      <Stack spacing={1.5} sx={{ maxWidth: '42rem', mx: 'auto', textAlign: 'center' }}>
        <Typography variant="overline" sx={{ color: 'moss.main' }}>
          {title}
        </Typography>
        <Typography component="h2" variant="h4" color="text.primary">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </Stack>
    </Paper>
  )
}
