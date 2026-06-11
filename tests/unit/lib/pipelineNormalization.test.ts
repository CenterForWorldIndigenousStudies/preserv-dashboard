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
})
