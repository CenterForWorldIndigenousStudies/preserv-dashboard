import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ProcessStageDetailList } from '@molecules/ProcessStageDetailList'
import type { ProcessStageStatus } from 'types/pipelineContracts'

function buildStageStatus(overrides: Partial<ProcessStageStatus> = {}): ProcessStageStatus {
  return {
    status: 'completed',
    requestId: null,
    requestedByApp: null,
    initiatedAt: '2026-05-29T00:00:00.000Z',
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
    processedCount: 0,
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
    maxPasses: 2,
    completedPasses: [],
    sourceFolderIds: ['folder-1'],
    collectionName: 'Collection A',
    collectionNotes: 'Notes',
    mode: null,
    openaiBatchWave1: null,
    openaiBatchWave2: null,
    ...overrides,
  }
}

describe('ProcessStageDetailList', () => {
  it('renders timestamps, pass information, and source folders', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessStageDetailList stage={buildStageStatus()} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Initiated')
    expect(markup).toContain('Pass')
    expect(markup).toContain('1 / 2')
    expect(markup).toContain('Source folders')
    expect(markup).toContain('folder-1')
    expect(markup).toContain('Collection')
    expect(markup).toContain('Collection A')
  })
})
