import { describe, expect, it } from 'vitest'

import { formatExecutionLabel, formatReviewWarning } from '@lib/pipelineFormatting'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function buildBatch(overrides: Partial<ProcessBatchStatus> = {}): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: null,
    createdAt: null,
    pipelineRequestedStages: [],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    metadataValidator: null,
    rightsDeterminator: null,
    currentExecution: null,
    ...overrides,
  }
}

describe('pipeline formatting helpers', () => {
  it('formats review warnings only when documents need review', () => {
    expect(formatReviewWarning(0)).toBeNull()
    expect(formatReviewWarning(1)).toBe('1 document needs review')
    expect(formatReviewWarning(3)).toBe('3 documents need review')
  })

  it('formats the current execution label with its restart stage', () => {
    expect(
      formatExecutionLabel(
        buildBatch({
          currentExecution: {
            executionMode: 'rerun',
            operationId: 'operation-1',
            idempotencyKey: 'idempotency-1',
            stage: 'document_splitter',
            reason: 'Run clean candidates',
            sourceDocumentIds: [],
          },
        }),
      ),
    ).toBe('Rerun from document_splitter')
  })
})
