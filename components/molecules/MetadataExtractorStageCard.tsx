'use client'

import type { ReactElement } from 'react'

import { ProcessStageCard } from '@molecules/ProcessStageCard'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

interface MetadataExtractorStageCardProps {
  batch: ProcessBatchStatus
  stage: ProcessStageStatus | null
}

export function MetadataExtractorStageCard({ batch, stage }: MetadataExtractorStageCardProps): ReactElement | null {
  const showOpenAIBatchActions =
    (stage?.mode === 'openai_batch' || batch.pipelineConfig?.metadataExtraction.mode === 'openai_batch') &&
    stage !== null

  return (
    <ProcessStageCard
      label={'Metadata Extractor'}
      stage={stage}
      batchId={batch.batchId}
      showOpenAIBatchActions={showOpenAIBatchActions}
    />
  )
}
