'use client'

import type { ReactElement } from 'react'
import { Link, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { validate as validateUuid } from 'uuid'

import { isLikelyGoogleDriveId } from '@lib/google'
import { truncateString } from '@lib/strings'

interface SourceIdProps {
  value: string | null | undefined
  maxTruncationLength?: number
  sx?: SxProps<Theme>
}

export function SourceId({ value, maxTruncationLength = 0, sx }: SourceIdProps): ReactElement {
  const normalizedValue = value?.trim() || '-'
  const truncatedSourceId = truncateString(normalizedValue, maxTruncationLength)

  const isUuid = validateUuid(normalizedValue)
  let href = `https://drive.google.com/file/d/${normalizedValue}/view`
  let title = `View Google Drive file ${normalizedValue}`

  if (isUuid) {
    href = `/documents/${normalizedValue}`
    title = `View preservation document ${normalizedValue}`
  }

  if (!isUuid && !isLikelyGoogleDriveId(normalizedValue)) {
    return (
      <Typography component="span" variant="body2" sx={sx}>
        {truncatedSourceId}
      </Typography>
    )
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      underline="hover"
      sx={(theme: Theme) => ({
        color: theme.palette.moss?.main ?? theme.palette.primary.main,
        ...theme.unstable_sx(sx ?? {}),
      })}
    >
      {truncatedSourceId}
    </Link>
  )
}
