'use client'

import type { ReactElement } from 'react'

import { isLikelyGoogleDriveId } from '@lib/google'
import { truncateString } from '@lib/strings'

interface SourceFolderIdProps {
  value: string | null | undefined
  maxTruncationLength?: number
}

export function SourceFolderId({ value, maxTruncationLength = 0 }: SourceFolderIdProps): ReactElement {
  const normalizedValue = value?.trim() || '-'
  const truncatedSourceFolderId = truncateString(normalizedValue, maxTruncationLength)

  console.log('SourceFolderId render', { value, normalizedValue, truncatedSourceFolderId })
  if (!isLikelyGoogleDriveId(normalizedValue)) {
    return <span>{truncatedSourceFolderId}</span>
  }

  const href = `https://drive.google.com/drive/folders/${normalizedValue}`

  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-moss hover:underline" title={href}>
      {truncatedSourceFolderId}
    </a>
  )
}
