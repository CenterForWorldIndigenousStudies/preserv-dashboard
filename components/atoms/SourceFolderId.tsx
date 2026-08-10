'use client'

import type { ReactElement } from 'react'
import { Link, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

import { isLikelyGoogleDriveId } from '@lib/google'
import { truncateString } from '@lib/strings'

interface SourceFolderIdProps {
  value: string | null | undefined
  maxTruncationLength?: number
  sx?: SxProps<Theme>
}

export function SourceFolderId({ value, maxTruncationLength = 0, sx }: SourceFolderIdProps): ReactElement {
  const normalizedValue = value?.trim() || '-'
  const truncatedSourceFolderId = truncateString(normalizedValue, maxTruncationLength)
  if (!isLikelyGoogleDriveId(normalizedValue)) {
    return (
      <Typography component={'span'} variant={'body2'} sx={sx}>
        {truncatedSourceFolderId}
      </Typography>
    )
  }

  const href = `https://drive.google.com/drive/folders/${normalizedValue}`
  const title = `View Google Drive folder ${normalizedValue}`

  return (
    <Link
      href={href}
      target={'_blank'}
      rel={'noreferrer'}
      title={title}
      underline={'hover'}
      sx={(theme: Theme) => ({
        color: theme.palette.primary.main,
        ...theme.unstable_sx(sx ?? {}),
      })}
    >
      {truncatedSourceFolderId}
    </Link>
  )
}
