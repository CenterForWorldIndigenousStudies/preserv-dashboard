import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ProcessBatchStatusCard } from '@molecules/ProcessBatchStatusCard'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function buildBatchStatus(overrides: Partial<ProcessBatchStatus> = {}): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-07-02T00:00:00.000Z',
    pipelineRequestedStages: ['metadata-extraction'],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    metadataValidator: null,
    ...overrides,
  }
}

describe('ProcessBatchStatusCard', () => {
  it('shows metadata extractor service details when extraction was requested but has not started yet', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard batch={buildBatchStatus()} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Metadata Extractor')
    expect(markup).toContain('pending')
  })

  it('shows metadata validator details and validator-specific metrics', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard
          batch={buildBatchStatus({
            pipelineRequestedStages: ['metadata-extraction', 'metadata-validation'],
            metadataValidator: {
              status: 'completed',
              requestId: 'request-10',
              requestedByApp: 'preserv-dashboard',
              initiatedAt: '2026-07-02T00:00:00.000Z',
              startedAt: '2026-07-02T00:00:01.000Z',
              completedAt: '2026-07-02T00:00:05.000Z',
              lastTransitionAt: '2026-07-02T00:00:05.000Z',
              error: null,
              callbackDeliveryStatus: null,
              callbackNotifiedAt: null,
              callbackReceivedAt: null,
              callbackHttpStatus: null,
              callbackErrorType: null,
              callbackErrorMessage: null,
              processedCount: 4,
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
              metadataValidatedCount: 3,
              underReviewCount: 1,
              versionedCount: 0,
              resolvedCount: 0,
              skippedCount: 0,
              reviewNeededCount: 0,
              failedCount: 0,
              currentPass: 1,
              maxPasses: 1,
              completedPasses: [1],
              sourceFolderIds: [],
              collectionName: null,
              collectionNotes: null,
            },
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Metadata Validator')
    expect(markup).toContain('Validated')
    expect(markup).toContain('Under Review')
  })
})
