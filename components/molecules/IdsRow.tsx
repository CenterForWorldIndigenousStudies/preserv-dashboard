import type { ReactElement } from 'react'
import { Stack } from '@mui/material'

import { IdElement } from '@atoms/IdElement'
import { SourceId } from '@atoms/SourceId'
import { truncateString } from '@lib/strings'

interface IdsRowProps {
  /** Document UUID */
  id: string
  /** Optional legacy ID to display alongside the document name */
  legacyId?: string | null
  /** Optional source ID to display alongside the document name */
  sourceId?: string | null
  /** Maximum character length before truncating secondary IDs (default: 12) */
  maxTruncationLength?: number
}

/** Returns the first 8 characters of a document UUID. */
function formatShortDocumentId(documentId: string): string {
  return documentId.slice(0, 8)
}

export function IdsRow({ id, legacyId, sourceId, maxTruncationLength = 12 }: IdsRowProps): ReactElement {
  const shortId = formatShortDocumentId(id)
  const truncatedLegacyId = truncateString(legacyId, maxTruncationLength)
  const truncatedSourceId = truncateString(sourceId, maxTruncationLength)

  return (
    <Stack
      direction={'row'}
      spacing={2}
      sx={{ alignItems: 'center', color: 'text.secondary', flexWrap: 'wrap', fontSize: '0.75rem' }}
    >
      <IdElement id={shortId} label={`ID`} title={`Database ID`} />

      {truncatedSourceId && (
        <IdElement
          id={<SourceId value={sourceId} maxTruncationLength={maxTruncationLength} />}
          label={`Source`}
          title={sourceId}
        />
      )}

      {truncatedLegacyId && <IdElement id={truncatedLegacyId} label={`Legacy`} title={legacyId} />}
    </Stack>
  )
}
