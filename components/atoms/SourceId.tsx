'use client'

import type { ReactElement } from 'react'
import { validate as validateUuid } from 'uuid'

import { isLikelyGoogleDriveId } from '@lib/google'
import { truncateString } from '@lib/strings'

interface SourceIdProps {
  value: string | null | undefined
  maxTruncationLength?: number
}

export function SourceId({ value, maxTruncationLength = 0 }: SourceIdProps): ReactElement {
  const normalizedValue = value?.trim() || '-'
  const truncatedSourceId = truncateString(normalizedValue, maxTruncationLength)

  console.log('SourceId render', { value, normalizedValue, truncatedSourceId })

  const isUuid = validateUuid(normalizedValue)
  let href = `https://drive.google.com/file/d/${normalizedValue}/view`
  let title = `View Google Drive file ${normalizedValue}`

  if (isUuid) {
    href = `/documents/${normalizedValue}`
    title = `View preservation document ${normalizedValue}`
  }

  if (!isUuid && !isLikelyGoogleDriveId(normalizedValue)) {
    return <span>{truncatedSourceId}</span>
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-moss hover:underline" title={title}>
      {truncatedSourceId}
    </a>
  )
}
