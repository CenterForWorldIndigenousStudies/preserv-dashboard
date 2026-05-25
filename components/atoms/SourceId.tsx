'use client'

import type { ReactElement } from 'react'

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
  if (!isLikelyGoogleDriveId(normalizedValue)) {
    return <span>{truncatedSourceId}</span>
  }

  const href = `https://drive.google.com/file/d/${normalizedValue}/view`

  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-moss hover:underline" title={href}>
      {truncatedSourceId}
    </a>
  )
}
