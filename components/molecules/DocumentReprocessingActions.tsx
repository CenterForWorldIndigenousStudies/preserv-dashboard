'use client'

import { useState } from 'react'
import { Button } from '@mui/material'

import { PipelineExecutionDialog } from '@molecules/PipelineExecutionDialog'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

interface DocumentReprocessingActionsProps {
  documentIds: string[]
}

function buildSelectionBatch(): ProcessBatchStatus {
  const completedStage = { status: 'completed' } as ProcessStageStatus
  return {
    batchId: '',
    batchName: null,
    startedBy: null,
    createdAt: null,
    pipelineRequestedStages: [],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: completedStage,
    pageRotator: completedStage,
    ocrProcessor: completedStage,
    contentDedup: completedStage,
    metadataExtractor: completedStage,
    metadataValidator: completedStage,
    rightsDeterminator: completedStage,
    fedoraIngester: null,
  }
}

export function DocumentReprocessingActions({ documentIds }: DocumentReprocessingActionsProps): React.ReactElement {
  const [open, setOpen] = useState(false)

  if (documentIds.length === 0) {
    return <></>
  }

  return (
    <>
      <Button variant={'outlined'} onClick={() => setOpen(true)}>
        {`Reprocess selected (${documentIds.length})`}
      </Button>
      <PipelineExecutionDialog
        batch={buildSelectionBatch()}
        mode={'reprocess'}
        open={open}
        onClose={() => setOpen(false)}
        documentIds={documentIds}
      />
    </>
  )
}
