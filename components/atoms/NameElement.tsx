import type { ReactElement } from 'react'
import { Typography } from '@mui/material'
import Link from 'next/link'

interface NameElementProps {
  name?: string | null
  fallbackName?: string
  href?: string
}

export function NameElement({ name, fallbackName = 'Untitled document', href }: NameElementProps): ReactElement {
  const resolvedName = name?.trim() || fallbackName
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
