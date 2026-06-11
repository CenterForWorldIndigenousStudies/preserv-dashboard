'use client'

import type { ReactElement } from 'react'
import { Chip, Stack } from '@mui/material'

import { NameElement } from '@atoms/NameElement'
import { IdsRow } from '@molecules/IdsRow'

interface DocumentNameBlockProps {
  /** Document name - shows "Untitled document" fallback when null/empty */
  name: string | null
  /** Document UUID */
  id: string
  /** Whether this document is the canonical version */
  isCanonical?: boolean
  /** Optional legacy ID to display alongside the document name */
  legacyId?: string | null
  /** Optional source ID to display alongside the document name */
  sourceId?: string | null
  /** Optional link href - renders as a clickable MUI Link when provided */
  href?: string
  /** Maximum character length before truncating secondary IDs (default: 20) */
  maxTruncationLength?: number
}

/**
 * Atom: Document name with short ID and optional legacy/source ID metadata.
 * Renders as a clickable MUI Link when href is provided, or plain Typography otherwise.
 */
export function DocumentNameBlock({
  name,
  id,
  isCanonical,
  legacyId,
  sourceId,
  href,
  maxTruncationLength = 20,
}: DocumentNameBlockProps): ReactElement {
  return (
    <Stack direction="column" spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <NameElement name={name} href={href} />
        {isCanonical ? (
          <Chip
            label="Canonical"
            size="small"
            variant="outlined"
            color="success"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.06rem',
              textTransform: 'uppercase',
            }}
          />
        ) : null}
      </Stack>
      <IdsRow id={id} legacyId={legacyId} sourceId={sourceId} maxTruncationLength={maxTruncationLength} />
    </Stack>
  )
}
