import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

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
    rightsDeterminator: null,
    ...overrides,
  }
}

describe('ProcessBatchStatusCard', () => {
  it('links the batch heading to its detail page', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard batch={buildBatchStatus()} />
      </ThemeProvider>,
    )

    expect(markup).toContain('href="/batches/batch-1"')
  })

  it('labels the active execution as a rerun', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard
          batch={buildBatchStatus({
            currentExecution: {
              executionMode: 'rerun',
              operationId: 'operation-1',
              idempotencyKey: 'idempotency-1',
              stage: 'document_splitter',
              reason: 'Run clean candidates',
              sourceDocumentIds: ['document-1'],
            },
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Execution:</span> Rerun from document_splitter')
  })

  it('explains when a post-start Dashboard edit blocks rollback', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard
          batch={buildBatchStatus({
            lifecycleStatus: 'completed',
            publicationStatus: 'not_started',
            manualEditAfterStart: true,
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Rollback unavailable: a Dashboard edit was made after the batch started.')
    expect(markup).not.toContain('Undo batch')
  })

  it('shows rollback failure details', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard
          batch={buildBatchStatus({
            lifecycleStatus: 'rollback_failed',
            publicationStatus: 'not_started',
            rollbackStatus: 'failed',
            rollbackFailure: 'Tag is still referenced',
            rollbackCounts: {
              deleted: 8,
              restored: 7,
              cancelled: 0,
              conflicts: 15,
              failed: 0,
            },
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Rollback:</span> failed')
    expect(markup).toContain('Rollback failure:</span> Tag is still referenced')
    expect(markup).toContain('Retry rollback')
  })

  it('shows ocr processor service details when ocr was requested but has not started yet', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard
          batch={buildBatchStatus({
            pipelineRequestedStages: ['ocr-processor'],
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('OCR Processor')
    expect(markup).toContain('pending')
  })

  it('shows metadata extractor service details when extraction was requested but has not started yet', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard batch={buildBatchStatus()} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Metadata Extractor')
    expect(markup).toContain('pending')
  })

  it('keeps the OpenAI batch status action unavailable before wave one submission exists', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard
          batch={buildBatchStatus({
            pipelineConfig: {
              profileId: 'custom',
              mode: 'custom',
              metadataExtraction: { mode: 'openai_batch' },
              executionPlan: [],
            },
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Check OpenAI batch status becomes available after wave 1 has been submitted.')
    expect(markup).toContain('Run wave 2 becomes available after wave 1 has been imported.')
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
              rightsDeterminedCount: 0,
              needsReviewCount: 1,
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
              mode: null,
              openaiBatchWave1: null,
              openaiBatchWave2: null,
            },
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Metadata Validator')
    expect(markup).toContain('Validated')
    expect(markup).toContain('Needs Review')
  })

  it('warns when a completed stage still has review-needed documents', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard
          batch={buildBatchStatus({
            pipelineRequestedStages: ['ocr-processor'],
            ocrProcessor: {
              status: 'completed',
              requestId: 'request-12',
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
              passedThroughCount: 1,
              rotatedCount: 0,
              normalizedCount: 0,
              ocrCompletedCount: 3,
              extractedCount: 0,
              metadataValidatedCount: 0,
              rightsDeterminedCount: 0,
              needsReviewCount: 0,
              versionedCount: 0,
              resolvedCount: 0,
              skippedCount: 0,
              reviewNeededCount: 1,
              failedCount: 0,
              currentPass: 1,
              maxPasses: 1,
              completedPasses: [1],
              sourceFolderIds: [],
              collectionName: null,
              collectionNotes: null,
              mode: null,
              openaiBatchWave1: null,
              openaiBatchWave2: null,
            },
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('OCR Processor')
    expect(markup).toContain('1 document needs review')
    expect(markup).toContain('completed')
  })

  it('shows pending rights determinator details when rights was requested but has not started yet', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard
          batch={buildBatchStatus({
            pipelineRequestedStages: ['metadata-extraction', 'metadata-validation', 'rights-determinator'],
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Rights Determinator')
    expect(markup).toContain('pending')
  })

  it('shows rights determinator details and rights-specific metrics', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessBatchStatusCard
          batch={buildBatchStatus({
            pipelineRequestedStages: ['metadata-extraction', 'metadata-validation', 'rights-determinator'],
            rightsDeterminator: {
              status: 'completed',
              requestId: 'request-11',
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
              metadataValidatedCount: 0,
              rightsDeterminedCount: 2,
              needsReviewCount: 1,
              versionedCount: 0,
              resolvedCount: 0,
              skippedCount: 0,
              reviewNeededCount: 0,
              failedCount: 1,
              currentPass: 1,
              maxPasses: 1,
              completedPasses: [1],
              sourceFolderIds: [],
              collectionName: null,
              collectionNotes: null,
              mode: null,
              openaiBatchWave1: null,
              openaiBatchWave2: null,
            },
          })}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Rights Determinator')
    expect(markup).toContain('Rights Determined')
    expect(markup).toContain('Needs Review')
    expect(markup).toContain('Failed')
  })
})
