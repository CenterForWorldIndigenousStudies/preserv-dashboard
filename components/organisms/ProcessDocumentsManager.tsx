'use client'

import type { ReactElement } from 'react'

import { ProcessDocumentsWorkspace } from '@organisms/ProcessDocumentsWorkspace'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface ProcessDocumentsManagerProps {
  initialBatches: ProcessBatchStatus[]
}

export function ProcessDocumentsManager({ initialBatches }: ProcessDocumentsManagerProps): ReactElement {
  return <ProcessDocumentsWorkspace initialBatches={initialBatches} />
}
