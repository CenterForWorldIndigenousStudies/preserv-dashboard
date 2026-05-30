import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ProcessBatchMonitor } from '@organisms/ProcessBatchMonitor'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function buildBatchStatus(): ProcessBatchStatus {
  return {
    batchId: 'batch-1',
    batchName: 'Batch 1',
    startedBy: 'archivist@example.org',
    createdAt: '2026-05-29T00:00:00.000Z',
    pipelineRequestedStages: ['document-splitter', 'page-rotator'],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
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
    expect(markup).toContain('document-splitter, page-rotator')
  })
})
