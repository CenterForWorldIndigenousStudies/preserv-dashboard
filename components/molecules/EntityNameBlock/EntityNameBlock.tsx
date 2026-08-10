'use client'

import type { ReactElement, ReactNode } from 'react'
import { Stack } from '@mui/material'

import { NameElement } from '@atoms/NameElement'
import { IdsRow } from '@molecules/IdsRow'

interface EntityNameBlockProps {
  /** Display name - uses fallbackName when null/empty */
  name: string | null
  /** Entity UUID or other primary identifier */
  id: string
  /** Optional legacy identifier to display alongside the entity name */
  legacyId?: string | null
  /** Optional source identifier to display alongside the entity name */
  sourceId?: string | null
  /** Optional content displayed beside the entity name */
  badges?: ReactNode
  /** Fallback name used when name is null or empty */
  fallbackName?: string
  /** Optional link href - renders as a clickable MUI Link when provided */
  href?: string
  /** Maximum character length before truncating secondary IDs (default: 20) */
  maxTruncationLength?: number
}

/**
 * Molecule: Entity name with compact ID and optional legacy/source ID metadata.
 * Renders as a clickable MUI Link when href is provided, or plain Typography otherwise.
 */
export function EntityNameBlock({
  name,
  id,
  legacyId,
  sourceId,
  badges,
  fallbackName = 'Untitled document',
  href,
  maxTruncationLength = 20,
}: EntityNameBlockProps): ReactElement {
  return (
    <Stack direction={'column'} spacing={0.5}>
      <Stack direction={'row'} spacing={1} sx={{ alignItems: 'center' }}>
        <NameElement name={name} fallbackName={fallbackName} href={href} />
        {badges}
      </Stack>
      <IdsRow id={id} legacyId={legacyId} sourceId={sourceId} maxTruncationLength={maxTruncationLength} />
    </Stack>
  )
}
