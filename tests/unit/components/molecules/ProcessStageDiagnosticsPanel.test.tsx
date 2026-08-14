import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ProcessStageDiagnosticsPanel } from '@molecules/ProcessStageDiagnosticsPanel'
import type { ProcessStageStatus } from 'types/pipelineContracts'

function buildStageStatus(overrides: Partial<ProcessStageStatus> = {}): ProcessStageStatus {
  return {
    status: 'failed',
    requestId: null,
    requestedByApp: null,
    initiatedAt: null,
    startedAt: null,
    completedAt: null,
    lastTransitionAt: null,
    error: 'Stage failed',
    callbackDeliveryStatus: null,
    callbackNotifiedAt: null,
    callbackReceivedAt: null,
    callbackHttpStatus: 500,
    callbackErrorType: 'HTTPError',
    callbackErrorMessage: 'Internal Server Error',
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
    failedCount: 1,
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

describe('ProcessStageDiagnosticsPanel', () => {
  it('renders stage and callback diagnostics', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ProcessStageDiagnosticsPanel stage={buildStageStatus()} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Stage failed')
    expect(markup).toContain('Callback diagnostic')
    expect(markup).toContain('HTTPError')
    expect(markup).toContain('Internal Server Error')
  })
})
