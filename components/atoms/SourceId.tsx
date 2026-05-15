'use client'

import type { ReactElement } from 'react'

interface SourceIdProps {
  value: string | null | undefined
}

function isLikelyGoogleDriveFileId(value: string): boolean {
  return /^[A-Za-z0-9_-]{10,}$/.test(value)
}

export function SourceId({ value }: SourceIdProps): ReactElement {
  const normalizedValue = value?.trim() ?? ''

  if (!normalizedValue) {
    return <span>-</span>
  }

  if (!isLikelyGoogleDriveFileId(normalizedValue)) {
    return <span>{normalizedValue}</span>
  }

  const href = `https://drive.google.com/file/d/${normalizedValue}/view`

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-moss hover:underline"
      title={normalizedValue}
    >
      {normalizedValue}
    </a>
  )
}
