import { describe, expect, test } from 'vitest'

import { normalizeProcessBatchDetails, parseProcessingDetails } from '@lib/pipelineNormalization'
import type { RawProcessBatchDetails } from 'types/pipelineContracts'

describe('pipelineNormalization', () => {
  test('parses empty processing details safely', () => {
    expect(parseProcessingDetails(null)).toEqual({})
    expect(parseProcessingDetails('')).toEqual({})
    expect(parseProcessingDetails('not-json')).toEqual({})
  })

  test('identifies flattened legacy imports without a pipeline section', () => {
    const normalized = normalizeProcessBatchDetails({
      legacyImport: {
        status: 'historical',
        processingTimeSeconds: 321,
      },
    })

    expect(normalized.pipelineExecutionMode).toBe('legacy_import')
    expect(normalized.legacyImportStatus).toBe('historical')
  })

  test('uses canonical dataIngester and pass-based splitter/rotator keys', () => {
    const normalized = normalizeProcessBatchDetails({
      pipeline: {
        requestedStages: ['document_splitter', 'page_rotator'],
      },
      dataIngester: {
        status: 'completed',
        startedAt: 1717000000,
        completedAt: 1717000060,
      },
      documentSplitterPass1: {
        status: 'completed',
        currentPass: 1,
        maxPasses: 2,
      },
      documentSplitterPass2: {
        status: 'running',
        currentPass: 2,
        maxPasses: 2,
      },
      pageRotatorPass1: {
        status: 'queued',
        currentPass: 1,
        maxPasses: 2,
      },
    })

    expect(normalized.pipelineRequestedStages).toEqual(['document_splitter', 'page_rotator'])
    expect(normalized.ingester?.status).toBe('completed')
    expect(normalized.ingester?.startedAt).toBe('2024-05-29T16:26:40.000Z')
    expect(normalized.documentSplitter?.status).toBe('running')
    expect(normalized.documentSplitter?.currentPass).toBe(2)
    expect(normalized.pageRotator?.status).toBe('queued')
  })

  test('reads canonical camelCase processing-details keys', () => {
    const normalized = normalizeProcessBatchDetails({
      pipeline: {
        executionMode: 'normal',
        requestedStages: ['ocr_processor'],
      },
      ocrProcessor: {
        status: 'running',
        requestId: 'request-10',
        startedAt: 1717000300,
      },
      documentSplitterPass1: {
        status: 'completed',
        currentPass: 1,
        maxPasses: 2,
      },
    })

    expect(normalized.pipelineExecutionMode).toBe('normal')
    expect(normalized.pipelineRequestedStages).toEqual(['ocr_processor'])
    expect(normalized.ocrProcessor?.requestId).toBe('request-10')
    expect(normalized.documentSplitter?.currentPass).toBe(1)
  })

  test('does not interpret snake_case processing-details keys', () => {
    const normalized = normalizeProcessBatchDetails(
      JSON.parse(
        JSON.stringify({
          pipeline: { requested_stages: ['ocr-processor'] },
          data_ingester: { status: 'completed', started_at: 1717000000 },
        }),
      ) as RawProcessBatchDetails,
    )

    expect(normalized.pipelineRequestedStages).toEqual([])
    expect(normalized.ingester).toBeNull()
  })

  test('infers completed passes when explicit completedPasses is absent', () => {
    const normalized = normalizeProcessBatchDetails({
      documentSplitterPass1: { status: 'completed' },
      documentSplitterPass2: { status: 'queued' },
    })

    expect(normalized.documentSplitter?.completedPasses).toEqual([1])
  })

  test('does not infer completed passes from review_needed status', () => {
    const normalized = normalizeProcessBatchDetails({
      documentSplitterPass1: { status: 'review_needed' },
      documentSplitterPass2: { status: 'queued' },
    })

    expect(normalized.documentSplitter?.completedPasses).toEqual([])
  })

  test('parses callback receipt fields from unix timestamps', () => {
    const normalized = normalizeProcessBatchDetails({
      dataIngester: {
        status: 'completed',
        callback: {
          deliveryStatus: 'succeeded',
          notifiedAt: 1717000100,
          receivedAt: '1717000200',
          httpStatus: 204,
        },
      },
    })

    expect(normalized.ingester?.callbackDeliveryStatus).toBe('succeeded')
    expect(normalized.ingester?.callbackNotifiedAt).toBe('2024-05-29T16:28:20.000Z')
    expect(normalized.ingester?.callbackReceivedAt).toBe('2024-05-29T16:30:00.000Z')
    expect(normalized.ingester?.callbackHttpStatus).toBe(204)
  })

  test('parses metadata extractor stage details', () => {
    const normalized = normalizeProcessBatchDetails({
      pipeline: {
        requestedStages: ['content_dedup', 'metadata_extractor'],
      },
      metadataExtractor: {
        status: 'running',
        requestId: 'request-9',
        startedAt: 1717000300,
        completedAt: null,
      },
    })

    expect(normalized.pipelineRequestedStages).toEqual(['content_dedup', 'metadata_extractor'])
    expect(normalized.metadataExtractor?.status).toBe('running')
    expect(normalized.metadataExtractor?.requestId).toBe('request-9')
    expect(normalized.metadataExtractor?.startedAt).toBe('2024-05-29T16:31:40.000Z')
  })

})
