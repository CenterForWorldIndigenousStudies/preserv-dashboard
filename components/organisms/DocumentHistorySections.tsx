import type { ReactElement } from 'react'
import { Box } from '@mui/material'

import { AuditHistoryTable } from '@organisms/AuditHistoryTable'
import { DetailPageSection } from '@organisms/DetailPageSection'
import { StateHistoryTable } from '@organisms/StateHistoryTable'
import type { DocumentDetail } from 'types/documents'
import type { NeedsReviewReasonGroup } from 'types/needsReview'

export interface DocumentHistorySectionsProps {
  audits: DocumentDetail['audits']
  states: DocumentDetail['state_history']
  documentId: string
  needsReviewReasons: NeedsReviewReasonGroup[]
  diagnosticsHref?: string
}

export function DocumentHistorySections({
  audits,
  states,
  documentId,
  needsReviewReasons,
  diagnosticsHref,
}: DocumentHistorySectionsProps): ReactElement {
  return (
    <Box
      component={'section'}
      sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' } }}
    >
      <DetailPageSection title={'Audit History'}>
        <AuditHistoryTable audits={audits} />
      </DetailPageSection>
      <DetailPageSection title={'State History'}>
        <StateHistoryTable
          states={states}
          documentId={documentId}
          needsReviewReasons={needsReviewReasons}
          diagnosticsHref={diagnosticsHref}
        />
      </DetailPageSection>
    </Box>
  )
}
