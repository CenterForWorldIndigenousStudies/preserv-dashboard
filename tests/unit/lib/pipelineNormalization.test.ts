import { describe, expect, test } from 'vitest'

import { normalizeProcessBatchDetails, parseProcessingDetails } from '@lib/pipelineNormalization'

describe('pipelineNormalization', () => {
  test('parses empty processing details safely', () => {
    expect(parseProcessingDetails(null)).toEqual({})
    expect(parseProcessingDetails('')).toEqual({})
    expect(parseProcessingDetails('not-json')).toEqual({})
  })

  test('uses data_ingester and pass-based splitter/rotator keys', () => {
    const normalized = normalizeProcessBatchDetails({
      pipeline: {
        requested_stages: ['document-splitter', 'page-rotator'],
      },
      data_ingester: {
        status: 'completed',
        started_at: 1717000000,
        completed_at: 1717000060,
      },
      document_splitter_pass_1: {
        status: 'completed',
        current_pass: 1,
        max_passes: 2,
      },
      document_splitter_pass_2: {
        status: 'running',
        current_pass: 2,
        max_passes: 2,
      },
      page_rotator_pass_1: {
        status: 'queued',
        current_pass: 1,
        max_passes: 2,
      },
    })

    expect(normalized.pipelineRequestedStages).toEqual(['document-splitter', 'page-rotator'])
    expect(normalized.ingester?.status).toBe('completed')
    expect(normalized.ingester?.startedAt).toBe('2024-05-29T16:26:40.000Z')
    expect(normalized.documentSplitter?.status).toBe('running')
    expect(normalized.documentSplitter?.currentPass).toBe(2)
    expect(normalized.pageRotator?.status).toBe('queued')
  })

  test('infers completed passes when explicit completed_passes is absent', () => {
    const normalized = normalizeProcessBatchDetails({
      document_splitter_pass_1: { status: 'completed' },
      document_splitter_pass_2: { status: 'queued' },
    })

    expect(normalized.documentSplitter?.completedPasses).toEqual([1])
  })

  test('does not infer completed passes from review_needed status', () => {
    const normalized = normalizeProcessBatchDetails({
      document_splitter_pass_1: { status: 'review_needed' },
      document_splitter_pass_2: { status: 'queued' },
    })

    expect(normalized.documentSplitter?.completedPasses).toEqual([])
  })

  test('parses callback receipt fields from unix timestamps', () => {
    const normalized = normalizeProcessBatchDetails({
      data_ingester: {
        status: 'completed',
        callback: {
          delivery_status: 'succeeded',
          notified_at: 1717000100,
          received_at: '1717000200',
          http_status: 204,
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
        requested_stages: ['content-dedup', 'metadata-extraction'],
      },
      metadata_extractor: {
        status: 'running',
        request_id: 'request-9',
        started_at: 1717000300,
        completed_at: null,
      },
    })

    expect(normalized.pipelineRequestedStages).toEqual(['content-dedup', 'metadata-extraction'])
    expect(normalized.metadataExtractor?.status).toBe('running')
    expect(normalized.metadataExtractor?.requestId).toBe('request-9')
    expect(normalized.metadataExtractor?.startedAt).toBe('2024-05-29T16:31:40.000Z')
  })

  test('parses metadata validator stage details', () => {
    const normalized = normalizeProcessBatchDetails({
      pipeline: {
        requested_stages: ['metadata-extraction', 'metadata-validation'],
      },
      metadata_validator: {
        status: 'completed',
        request_id: 'request-10',
        started_at: 1717000400,
        metadata_validated_count: 3,
        needs_review_count: 1,
        failed_count: 0,
      },
    })

    expect(normalized.pipelineRequestedStages).toEqual(['metadata-extraction', 'metadata-validation'])
    expect(normalized.metadataValidator?.status).toBe('completed')
    expect(normalized.metadataValidator?.requestId).toBe('request-10')
    expect(normalized.metadataValidator?.startedAt).toBe('2024-05-29T16:33:20.000Z')
    expect(normalized.metadataValidator?.metadataValidatedCount).toBe(3)
    expect(normalized.metadataValidator?.needsReviewCount).toBe(1)
  })

  test('parses rights determinator stage details', () => {
    const normalized = normalizeProcessBatchDetails({
      pipeline: {
        requested_stages: ['metadata-extraction', 'metadata-validation', 'rights-determinator'],
      },
      rights_determinator: {
        status: 'completed',
        request_id: 'request-11',
        started_at: 1717000500,
        rights_determined_count: 2,
        needs_review_count: 1,
        failed_count: 1,
      },
    })

    expect(normalized.pipelineRequestedStages).toEqual(['metadata-extraction', 'metadata-validation', 'rights-determinator'])
    expect(normalized.rightsDeterminator?.status).toBe('completed')
    expect(normalized.rightsDeterminator?.requestId).toBe('request-11')
    expect(normalized.rightsDeterminator?.startedAt).toBe('2024-05-29T16:35:00.000Z')
    expect(normalized.rightsDeterminator?.rightsDeterminedCount).toBe(2)
    expect(normalized.rightsDeterminator?.needsReviewCount).toBe(1)
  })
})
