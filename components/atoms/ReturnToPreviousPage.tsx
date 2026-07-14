'use client'

import type { ReactElement } from 'react'
import NextLink from 'next/link'
import Link from '@mui/material/Link'

interface ReturnToPreviousPageProps {
  href: string
  label?: string
}

export function ReturnToPreviousPage({
  href,
  label = 'Return to previous page',
}: ReturnToPreviousPageProps): ReactElement {
  return (
    <Link
      component={NextLink}
      href={href}
      underline="hover"
      sx={{ alignSelf: 'flex-start', color: 'moss.main', fontSize: '0.875rem', fontWeight: 500 }}
    >
      {`← ${label}`}
    </Link>
  )
}
