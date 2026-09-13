import type { ReactElement } from 'react'
import Stack from '@mui/material/Stack'

import { Badge } from '@atoms/Badges/Badge'

interface DocumentRoleBadgesProps {
  isCandidate: boolean
  isCanonical: boolean
}

export function DocumentRoleBadges({ isCandidate, isCanonical }: DocumentRoleBadgesProps): ReactElement | null {
  if (!isCandidate && !isCanonical) {
    return null
  }

  return (
    <Stack
      direction={'column'}
      spacing={0.5}
      aria-label={'Document roles'}
      sx={{ alignItems: 'center', justifyContent: 'center' }}
    >
      {isCandidate ? (
        <Badge variant={'warning'} outlined>
          {'Candidate'}
        </Badge>
      ) : null}
      {isCanonical ? (
        <Badge variant={'success'} outlined>
          {'Canonical'}
        </Badge>
      ) : null}
    </Stack>
  )
}
