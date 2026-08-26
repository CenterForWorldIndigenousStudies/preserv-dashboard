import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ProcessBatchMonitor } from '@organisms/ProcessBatchMonitor'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

vi.mock('@organisms/ProcessBatchLiveProgress', () => ({
  ProcessBatchLiveProgress: ({ initialBatch }: { initialBatch: ProcessBatchStatus }) => (
    <div>
      {initialBatch.batchName}
      {'Requested Stages'}
      {initialBatch.pipelineRequestedStages.join(', ')}
      {'Metadata Extractor'}
    </div>
  ),
}))

function buildBatchStatus(): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-05-29T00:00:00.000Z',
    pipelineRequestedStages: ['document-splitter', 'page-rotator', 'metadata-extraction'],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: {
      status: 'running',
      requestId: 'request-1',
      requestedByApp: 'preserv-dashboard',
      initiatedAt: '2026-05-29T00:05:00.000Z',
      startedAt: '2026-05-29T00:05:05.000Z',
      completedAt: null,
      lastTransitionAt: '2026-05-29T00:05:05.000Z',
      error: null,
      callbackDeliveryStatus: null,
      callbackNotifiedAt: null,
      callbackReceivedAt: null,
      callbackHttpStatus: null,
      callbackErrorType: null,
      callbackErrorMessage: null,
      processedCount: 2,
      ingestedCount: 0,
      duplicateCount: 0,
      exactDuplicateCount: 0,
      skippedSameOriginCount: 0,
      splitCount: 0,
      childCount: 0,
      passedThroughCount: 0,
      rotatedCount: 0,
      normalizedCount: 0,
      ocrCompletedCount: 0,
      extractedCount: 0,
      metadataValidatedCount: 0,
      rightsDeterminedCount: 0,
      needsReviewCount: 0,
      versionedCount: 0,
      resolvedCount: 0,
      skippedCount: 0,
      reviewNeededCount: 0,
      failedCount: 0,
      currentPass: 1,
      maxPasses: 1,
      completedPasses: [],
      sourceFolderIds: [],
      collectionName: null,
      collectionNotes: null,
      mode: null,
      openaiBatchWave1: null,
      openaiBatchWave2: null,
    },
    metadataValidator: null,
    rightsDeterminator: null,
  }
}

describe('ProcessBatchMonitor', () => {
  it('renders recent batch cards', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchMonitor batches={[buildBatchStatus()]} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Batch 1')
    expect(markup).toContain('Requested Stages')
    expect(markup).toContain('document-splitter, page-rotator, metadata-extraction')
    expect(markup).toContain('Metadata Extractor')
  })
})
