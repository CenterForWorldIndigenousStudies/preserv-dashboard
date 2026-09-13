import type { ReactElement } from 'react'
import { Box } from '@mui/material'

import { DocumentBatchAssociations } from '@organisms/DocumentBatchAssociations'
import { DocumentReadinessDiagnostics } from '@organisms/DocumentReadinessDiagnostics'
import { DetailPageSection } from '@organisms/DetailPageSection'
import type { PipelineDiagnosticEvent, PipelineEventBatchLink } from 'types/commentPipeline'
import type { DocumentDetail } from 'types/documents'
import type { NeedsReviewReasonGroup } from 'types/needsReview'

export interface DocumentBatchesSectionProps {
  batchAssociations: DocumentDetail['document_to_batches']
  batchReturnHref: string
  batchReturnLabel: string
  readiness: DocumentDetail['readiness']
  activeReviewReasons: NeedsReviewReasonGroup[]
  pipelineEvents: PipelineDiagnosticEvent[]
  pipelineBatchLinks: Record<string, PipelineEventBatchLink>
}

export function DocumentBatchesSection({
  batchAssociations,
  batchReturnHref,
  batchReturnLabel,
  readiness,
  activeReviewReasons,
  pipelineEvents,
  pipelineBatchLinks,
}: DocumentBatchesSectionProps): ReactElement {
  return (
    <DetailPageSection title={'Batches'}>
      <DocumentBatchAssociations
        batchAssociations={batchAssociations}
        batchReturnHref={batchReturnHref}
        batchReturnLabel={batchReturnLabel}
      />
      <Box sx={{ mt: 4 }}>
        <DocumentReadinessDiagnostics
          readiness={readiness}
          activeReviewReasons={activeReviewReasons}
          pipelineEvents={pipelineEvents}
          pipelineBatchLinks={pipelineBatchLinks}
        />
      </Box>
    </DetailPageSection>
  )
}
