import type { ReactElement } from 'react'
import NextLink from 'next/link'
import { Paper, Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'

interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
  buildHref: (page: number) => string
}

export function Pagination({ currentPage, totalItems, pageSize, buildHref }: PaginationProps): ReactElement | null {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  if (totalPages <= 1) {
    return null
  }

  return (
    <Paper
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        flexWrap: 'wrap',
        border: '1px solid',
        borderColor: 'divider',
        px: 2,
        py: 1.5,
      }}
    >
      <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
        Page {currentPage} of {totalPages}
      </Typography>
      <Stack direction={'row'} spacing={1}>
        <Button
          component={NextLink}
          href={buildHref(Math.max(1, currentPage - 1))}
          variant={'primary'}
          size={'sm'}
          disabled={currentPage === 1}
        >
          {'Previous'}
        </Button>
        <Button
          component={NextLink}
          href={buildHref(Math.min(totalPages, currentPage + 1))}
          variant={'primary'}
          size={'sm'}
          disabled={currentPage === totalPages}
        >
          {'Next'}
        </Button>
      </Stack>
    </Paper>
  )
}
