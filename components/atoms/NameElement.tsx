import type { ReactElement } from 'react'
import { Typography } from '@mui/material'
import Link from 'next/link'

interface NameElementProps {
  name?: string | null
  href?: string
}

export function NameElement({ name, href }: NameElementProps): ReactElement {
  const DEFAULT_NAME = 'Untitled document'
  const resolvedName = name?.trim() || DEFAULT_NAME
  const style = { fontWeight: 500, lineHeight: 1.4 }
  return href ? (
    <Link href={href} passHref>
      <Name name={resolvedName} style={style} />
    </Link>
  ) : (
    <Name name={resolvedName} style={style} />
  )
}

function Name({ name, style }: { name: string | null; style: Record<string, unknown> }): ReactElement {
  return (
    <Typography variant={'body2'} color={'primary'} sx={style}>
      {name}
    </Typography>
  )
}
