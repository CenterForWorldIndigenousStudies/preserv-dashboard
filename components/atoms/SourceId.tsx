'use client'

import type { ReactElement } from 'react'
import { Link, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { validate as validateUuid } from 'uuid'

import { isLikelyGoogleDriveId } from '@lib/google'
import { getDocumentSourceLinkType, getDocumentSourceUrl, type DocumentSourceLinkOptions } from '@lib/documentSourceLinks'
import { truncateString } from '@lib/strings'
import { DOCUMENTS_PATH } from '@constants/paths'

interface SourceIdProps extends DocumentSourceLinkOptions {
  value: string | null | undefined
  maxTruncationLength?: number
  sx?: SxProps<Theme>
}

export function SourceId({ value, maxTruncationLength = 0, sx, fileExtension, fileName, mimeType }: SourceIdProps): ReactElement {
  const normalizedValue = value?.trim() || '-'
  const truncatedSourceId = truncateString(normalizedValue, maxTruncationLength)

  const isUuid = validateUuid(normalizedValue)
  const linkType = getDocumentSourceLinkType({ fileExtension, fileName, mimeType })
  const href = getDocumentSourceUrl(normalizedValue, { fileExtension, fileName, mimeType })
  let title = `View Google Drive file ${normalizedValue}`

  if (isUuid) {
    title = `View preservation document ${normalizedValue}`
  }

  if (!isUuid && linkType === 'google-docs') {
    title = `View Word document ${normalizedValue} in Google Docs`
  }

  if (!isUuid && linkType === 'google-slides') {
    title = `View PowerPoint presentation ${normalizedValue} in Google Slides`
  }

  if (!isUuid && linkType === 'google-sheets') {
    title = `View spreadsheet ${normalizedValue} in Google Sheets`
  }

  const resolvedHref = isUuid ? `${DOCUMENTS_PATH}/${normalizedValue}` : href

  if (!isUuid && !isLikelyGoogleDriveId(normalizedValue)) {
    return (
      <Typography component={'span'} variant={'body2'} sx={sx}>
        {truncatedSourceId}
      </Typography>
    )
  }

  return (
    <Link
      href={resolvedHref}
      target={'_blank'}
      rel={'noreferrer'}
      title={title}
      underline={'hover'}
      sx={(theme: Theme) => ({
        color: theme.palette.primary.main,
        ...theme.unstable_sx(sx ?? {}),
      })}
    >
      {truncatedSourceId}
    </Link>
  )
}
