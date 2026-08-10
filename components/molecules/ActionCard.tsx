import type { ReactElement } from 'react'
import { Typography } from '@mui/material'

import { LinkCardFrame } from '@molecules/LinkCardFrame'

export const DEFAULT_ACTION_CARD_LABEL = 'Open'

interface ActionCardProps {
  description: string
  eyebrow?: string
  href: string
  label?: string
  title: string
}

export function ActionCard({
  description,
  eyebrow,
  href,
  label = DEFAULT_ACTION_CARD_LABEL,
  title,
}: ActionCardProps): ReactElement {
  return (
    <LinkCardFrame actionLabel={label} eyebrow={eyebrow} href={href} title={title}>
      <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
        {description}
      </Typography>
    </LinkCardFrame>
  )
}
