import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { normalizeProcessBatchDetails } from '@lib/pipelineNormalization'
import { ProcessStageMetricsGrid } from '@molecules/ProcessStageMetricsGrid'
import type { ProcessStageStatus } from 'types/pipelineContracts'

function buildStageStatus(overrides: Partial<ProcessStageStatus> = {}): ProcessStageStatus {
  return {
    status: 'completed',
    requestId: null,
    requestedByApp: null,
    initiatedAt: null,
    startedAt: null,
    completedAt: null,
    lastTransitionAt: null,
    error: null,
    callbackDeliveryStatus: null,
    callbackNotifiedAt: null,
    callbackReceivedAt: null,
    callbackHttpStatus: null,
    callbackErrorType: null,
    callbackErrorMessage: null,
    processedCount: 12,
    ingestedCount: 11,
    duplicateCount: 1,
    exactDuplicateCount: 0,
    skippedSameOriginCount: 1,
    splitCount: 0,
    childCount: 0,
    passedThroughCount: 0,
    rotatedCount: 0,
    normalizedCount: 0,
    ocrCompletedCount: 0,
    extractedCount: 0,
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
    ...overrides,
  }
}

describe('ProcessStageMetricsGrid', () => {
  it('renders ingest metrics', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessStageMetricsGrid stageLabel="Ingest" stage={buildStageStatus()} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Processed')
    expect(markup).toContain('Ingested')
    expect(markup).toContain('Duplicates')
    expect(markup).toContain('Same Origin Skips')
  })

  it('renders splitter metrics separately for each pass', () => {
    const stage = normalizeProcessBatchDetails({
      documentSplitterPass1: {
        status: 'completed',
        processedCount: 1,
        splitCount: 1,
        childCount: 2,
      },
      documentSplitterPass2: {
        status: 'completed',
        processedCount: 0,
        splitCount: 0,
        childCount: 0,
      },
    }).documentSplitter
    if (!stage) throw new Error('Expected normalized document-splitter stage.')

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessStageMetricsGrid stageLabel={'Document Splitter'} stage={stage} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Pass 1')
    expect(markup).toContain('Pass 2')
    expect(markup).toContain('Child Docs')
    expect(markup.match(/>2<\/p>/)).not.toBeNull()
  })

  it('renders page-rotator metrics separately for each pass', () => {
    const stage = normalizeProcessBatchDetails({
      pageRotatorPass1: {
        status: 'completed',
        processedCount: 2,
        passedThroughCount: 2,
      },
      pageRotatorPass2: {
        status: 'completed',
        processedCount: 0,
        passedThroughCount: 0,
      },
    }).pageRotator
    if (!stage) throw new Error('Expected normalized page-rotator stage.')

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessStageMetricsGrid stageLabel={'Page Rotator'} stage={stage} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Pass 1')
    expect(markup).toContain('Pass 2')
    expect(markup).toContain('Pass Through')
    expect(markup.match(/>2<\/p>/)).not.toBeNull()
  })
})
