import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DocumentReadinessDiagnostics } from '@organisms/DocumentReadinessDiagnostics'

describe('DocumentReadinessDiagnostics', () => {
  it('renders readiness diagnostics as reusable detail cards', () => {
    const markup = renderToStaticMarkup(
      <DocumentReadinessDiagnostics
        readiness={{
          approved: false,
          isPreservationCandidate: true,
          unmetRequirements: ['dc_subject'],
          reasonGroups: [],
        }}
        pipelineEvents={[
          {
            runKey: 'ocr-run',
            service: 'ocr_processor',
            status: 'failed',
            timestamp: '2026-09-11T10:00:00Z',
            message: 'OCR timed out.',
            requestId: 'request-1',
            batchId: 'batch-1',
            documentId: 'document-1',
            details: null,
            severity: 'error',
          },
        ]}
        pipelineBatchLinks={{ 'batch-1': { name: 'September ingest', href: '/batches/batch-1' } }}
      />,
    )

    expect(markup).toContain('Processing Diagnostics')
    expect(markup).toContain('Readiness outcome')
    expect(markup).toContain('Needs review')
    expect(markup).toContain('Preservation candidate')
    expect(markup).toContain('Unmet requirements')
    expect(markup).toContain('grid-template-columns:repeat(4, minmax(0, 1fr))')
    expect(markup).toContain('Pipeline Event History')
    expect(markup).toContain('OCR timed out.')
    expect(markup).toContain('September ingest')
  })
})
