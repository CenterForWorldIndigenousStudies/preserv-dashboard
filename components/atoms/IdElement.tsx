import type { ReactElement, ReactNode } from 'react'
import { Tooltip, Typography } from '@mui/material'

interface IdElementProps {
  id?: ReactNode | null
  label?: string
  title?: string | null
}

export function IdElement({ id, label, title }: IdElementProps): ReactElement {
  return title ? (
    <Tooltip title={title} enterDelay={400}>
      <Id id={id} label={label} />
    </Tooltip>
  ) : (
    <Id id={id} label={label} />
  )
}

function Id({ id, label }: Omit<IdElementProps, "title">): ReactElement {
  return <Typography
    variant={`caption`}
    component={`span`}
    sx={{ color: 'text.secondary', fontSize: 'inherit' }}
  >
    {`${label} `}
    {id}
  </Typography>
}
