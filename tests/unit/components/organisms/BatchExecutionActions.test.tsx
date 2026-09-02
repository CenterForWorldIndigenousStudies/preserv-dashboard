import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecules/PipelineExecutionDialog', () => ({
  PipelineExecutionDialog: () => null,
}))

import ThemeProvider from '@components/ThemeProvider'
import { BatchExecutionActions } from '@organisms/BatchExecutionActions'
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

describe('BatchExecutionActions', () => {
  it('disables rerun from stage for a reverted batch', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <BatchExecutionActions batch={buildBatchStatus({ lifecycleStatus: 'reverted' })} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Rerun from stage')
    expect(markup).toContain('disabled=""')
  })
})
