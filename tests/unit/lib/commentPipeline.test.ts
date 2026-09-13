import { describe, expect, it } from 'vitest'

import { parseCommentPipelineEvents } from '@lib/commentPipeline'

describe('parseCommentPipelineEvents', () => {
  it('unwraps and sorts structured pipeline events newest first', () => {
    const value = JSON.stringify({
      value: {
        'ocr_processor:2026-09-11T10:00:00+00:00:request-1:document-1': {
          service: 'ocr_processor',
          status: 'failed',
          timestamp: '2026-09-11T10:00:00+00:00',
          message: 'OCR timed out.',
          request_id: 'request-1',
          batch_id: 'batch-1',
          document_id: 'document-1',
          severity: 'error',
          details: { timeoutSeconds: 30 },
        },
        'document_splitter:2026-09-11T11:00:00+00:00:request-2:document-1': {
          service: 'document_splitter',
          status: 'review_needed',
          timestamp: '2026-09-11T11:00:00+00:00',
          message: 'Boundary requires review.',
        },
      },
    })

    expect(parseCommentPipelineEvents(value, 'json')).toEqual([
      {
        runKey: 'document_splitter:2026-09-11T11:00:00+00:00:request-2:document-1',
        service: 'document_splitter',
        status: 'review_needed',
        timestamp: '2026-09-11T11:00:00+00:00',
        message: 'Boundary requires review.',
        requestId: null,
        batchId: null,
        documentId: null,
        details: null,
        severity: null,
      },
      {
        runKey: 'ocr_processor:2026-09-11T10:00:00+00:00:request-1:document-1',
        service: 'ocr_processor',
        status: 'failed',
        timestamp: '2026-09-11T10:00:00+00:00',
        message: 'OCR timed out.',
        requestId: 'request-1',
        batchId: 'batch-1',
        documentId: 'document-1',
        details: { timeoutSeconds: 30 },
        severity: 'error',
      },
    ])
  })

  it('ignores malformed metadata and incomplete event entries', () => {
    expect(parseCommentPipelineEvents('not json', 'json')).toEqual([])
    expect(
      parseCommentPipelineEvents(
        JSON.stringify({ value: { invalid: { service: 'ocr_processor', status: 'failed' } } }),
        'json',
      ),
    ).toEqual([])
  })
})
