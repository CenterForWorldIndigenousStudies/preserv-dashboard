import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockEditHistoryFindFirst, mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockEditHistoryFindFirst: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    batches: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    edit_history: {
      findFirst: mockEditHistoryFindFirst,
    },
  },
}))

import {
  getProcessBatchStatus,
  markProcessStageCallbackReceived,
  recordMetadataExtractorCompletion,
  recordMetadataValidatorCompletion,
  recordRightsDeterminatorCompletion,
} from '@lib/processBatches'

function buildBatchRow(processingDetails: Record<string, unknown>) {
  return {
    id: 'batch-1',
    name: 'Batch 1',
    started_by: 'archivist@example.org',
    created_at: new Date('2026-05-29T04:00:00.000Z'),
    processing_details: JSON.stringify(processingDetails),
  }
}

function getUpdatedProcessingDetails(): Record<string, unknown> {
  expect(mockUpdate).toHaveBeenCalledTimes(1)
  const firstCall = mockUpdate.mock.calls[0] as [unknown] | undefined
  const updateArg = firstCall?.[0]
  expect(updateArg).toBeDefined()

  const typedUpdateArg = updateArg as {
    data: {
      processing_details: string
    }
  }

  return JSON.parse(typedUpdateArg.data.processing_details) as Record<string, unknown>
}

describe('processBatches', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('reports a post-start Dashboard edit as rollback ineligibility', async () => {
    const startedAt = new Date('2026-05-29T04:00:00.000Z')
    mockFindUnique.mockResolvedValue({
      ...buildBatchRow({ data_ingester: { status: 'completed' } }),
      started_at: startedAt,
      lifecycle_status: 'completed',
      publication_status: 'not_started',
      publication_target: 'fedora',
      batch_rollbacks: null,
    })
    mockEditHistoryFindFirst.mockResolvedValue({ id: 'edit-1' })

    const batch = await getProcessBatchStatus('batch-1')

    expect(batch?.manualEditAfterStart).toBe(true)
    expect(mockEditHistoryFindFirst).toHaveBeenCalledWith({
      where: {
        editor_email: { not: null },
        edited_at: { gt: startedAt },
      },
      select: { id: true },
    })
  })

  function queueCurrentBatchRow(): void {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requested_stages: ['document-splitter', 'page-rotator'],
        },
        data_ingester: {
          status: 'completed',
          request_id: 'request-1',
          requested_by_app: 'preserv-dashboard',
          initiated_at: 1780027200,
          started_at: 1780027205,
          completed_at: 1780027210,
          last_transition_at: 1780027210,
          processed_count: 12,
          ingested_count: 11,
          duplicate_count: 1,
          skipped_same_origin_count: 1,
          callback: {
            delivery_status: 'failed',
            notified_at: 1780027211,
            http_status: 500,
            error_type: 'HTTPError',
            error_message: 'Internal Server Error',
          },
        },
        document_splitter_pass_1: {
          status: 'completed',
          request_id: 'request-2',
          current_pass: 1,
          max_passes: 2,
          completed_passes: [1],
          split_count: 10,
          child_count: 12,
        },
        page_rotator_pass_1: {
          status: 'queued',
          request_id: 'request-3',
          current_pass: 1,
          max_passes: 2,
          completed_passes: [],
          rotated_count: 0,
        },
      }),
    )
  }

  it('parses ingester details from the current processing-details key and unix timestamps', async () => {
    queueCurrentBatchRow()
    const batch = await getProcessBatchStatus('batch-1')

    expect(batch).not.toBeNull()
    expect(batch?.ingester?.status).toBe('completed')
    expect(batch?.ingester?.initiatedAt).toBe('2026-05-29T04:00:00.000Z')
    expect(batch?.ingester?.completedAt).toBe('2026-05-29T04:00:10.000Z')
    expect(batch?.ingester?.callbackNotifiedAt).toBe('2026-05-29T04:00:11.000Z')
    expect(batch?.ingester?.processedCount).toBe(12)
  })

  it('parses pass-specific splitter and rotator details from the latest pass keys', async () => {
    queueCurrentBatchRow()
    const batch = await getProcessBatchStatus('batch-1')

    expect(batch).not.toBeNull()
    expect(batch?.documentSplitter?.status).toBe('completed')
    expect(batch?.documentSplitter?.currentPass).toBe(1)
    expect(batch?.documentSplitter?.completedPasses).toEqual([1])
    expect(batch?.pageRotator?.status).toBe('queued')
    expect(batch?.pageRotator?.currentPass).toBe(1)
  })

  it('infers completed splitter passes from pass-key statuses when completed_passes is absent', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requested_stages: ['document-splitter', 'page-rotator'],
        },
        document_splitter_pass_1: {
          status: 'completed',
          request_id: 'request-2',
          current_pass: 1,
          max_passes: 2,
          split_count: 10,
          child_count: 12,
        },
      }),
    )

    const batch = await getProcessBatchStatus('batch-1')

    expect(batch).not.toBeNull()
    expect(batch?.documentSplitter?.status).toBe('completed')
    expect(batch?.documentSplitter?.completedPasses).toEqual([1])
  })

  it('records ingester callback receipt under the data_ingester key', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        data_ingester: {
          status: 'completed',
          callback: {
            url: 'http://localhost/callback',
          },
        },
      }),
    )
    mockUpdate.mockResolvedValue(undefined)

    await markProcessStageCallbackReceived('batch-1', 'ingester', '2026-05-29T04:25:48.015Z')

    expect(getUpdatedProcessingDetails()).toEqual({
      data_ingester: {
        status: 'completed',
        callback: {
          url: 'http://localhost/callback',
          received_at: '2026-05-29T04:25:48.015Z',
        },
      },
    })
  })

  it('records callback receipt on the latest page-rotator pass key', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        page_rotator_pass_1: {
          status: 'completed',
          callback: {
            url: 'http://localhost/callback',
          },
        },
        page_rotator_pass_2: {
          status: 'running',
          callback: {
            url: 'http://localhost/callback',
          },
        },
      }),
    )
    mockUpdate.mockResolvedValue(undefined)

    await markProcessStageCallbackReceived('batch-2', 'page_rotator', '2026-05-29T04:30:00.000Z')

    expect(getUpdatedProcessingDetails()).toEqual({
      page_rotator_pass_1: {
        status: 'completed',
        callback: {
          url: 'http://localhost/callback',
        },
      },
      page_rotator_pass_2: {
        status: 'running',
        callback: {
          url: 'http://localhost/callback',
          received_at: '2026-05-29T04:30:00.000Z',
        },
      },
    })
  })

  it('parses metadata extractor details from processing details', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requested_stages: ['metadata-extraction'],
        },
        metadata_extractor: {
          status: 'completed',
          request_id: 'request-7',
          initiated_at: 1780027500,
          completed_at: 1780027560,
          processed_count: 4,
        },
      }),
    )

    const batch = await getProcessBatchStatus('batch-1')

    expect(batch).not.toBeNull()
    expect(batch?.pipelineRequestedStages).toEqual(['metadata-extraction'])
    expect(batch?.metadataExtractor?.status).toBe('completed')
    expect(batch?.metadataExtractor?.requestId).toBe('request-7')
    expect(batch?.metadataExtractor?.processedCount).toBe(4)
  })

  it('parses metadata extractor openai batch wave summaries from processing details', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requested_stages: ['metadata-extraction'],
          config: {
            profileId: 'custom',
            mode: 'custom',
            metadataExtraction: {
              mode: 'openai_batch',
            },
            executionPlan: [
              {
                id: 'step-ingester',
                stepId: 'ingester',
                service: 'ingester',
                label: 'Ingest',
                order: 0,
                enabled: true,
              },
              {
                id: 'step-metadata-extraction',
                stepId: 'metadata-extraction',
                service: 'metadata-extraction',
                label: 'Metadata Extraction',
                order: 1,
                enabled: true,
              },
            ],
          },
        },
        metadata_extractor: {
          status: 'in_progress',
          mode: 'openai_batch',
          openai_batch: {
            wave_1: {
              status: 'submitted',
              openai_batch_id: 'provider-batch-1',
              submitted_at: '2026-07-29T12:01:00.000Z',
              succeeded_count: 0,
              failed_count: 0,
            },
            wave_2: {
              status: 'not_started',
              processed_count: 0,
              succeeded_count: 0,
              failed_count: 0,
            },
          },
        },
      }),
    )

    const batch = await getProcessBatchStatus('batch-1')
    const extractor = batch?.metadataExtractor as (typeof batch.metadataExtractor & {
      mode?: string | null
      openaiBatchWave1?: {
        status: string | null
        openaiBatchId: string | null
        submittedAt: string | null
      } | null
      openaiBatchWave2?: {
        status: string | null
        processedCount: number
      } | null
    }) | null

    expect(extractor?.mode).toBe('openai_batch')
    expect(extractor?.openaiBatchWave1).toEqual(
      expect.objectContaining({
        status: 'submitted',
        openaiBatchId: 'provider-batch-1',
        submittedAt: '2026-07-29T12:01:00.000Z',
      }),
    )
    expect(extractor?.openaiBatchWave2?.status).toBe('not_started')
    expect(extractor?.openaiBatchWave2?.processedCount).toBe(0)
  })

  it('parses metadata validator details from processing details', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requested_stages: ['metadata-extraction', 'metadata-validation'],
        },
        metadata_validator: {
          status: 'completed',
          request_id: 'request-8',
          initiated_at: 1780027600,
          completed_at: 1780027660,
          processed_count: 4,
          metadata_validated_count: 3,
          under_review_count: 1,
          failed_count: 0,
        },
      }),
    )

    const batch = await getProcessBatchStatus('batch-1')

    expect(batch).not.toBeNull()
    expect(batch?.pipelineRequestedStages).toEqual(['metadata-extraction', 'metadata-validation'])
    expect(batch?.metadataValidator?.status).toBe('completed')
    expect(batch?.metadataValidator?.requestId).toBe('request-8')
    expect(batch?.metadataValidator?.metadataValidatedCount).toBe(3)
    expect(batch?.metadataValidator?.underReviewCount).toBe(1)
  })

  it('parses rights determinator details from processing details', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requested_stages: ['metadata-extraction', 'metadata-validation', 'rights-determinator'],
        },
        rights_determinator: {
          status: 'completed',
          request_id: 'request-11',
          initiated_at: 1780027700,
          completed_at: 1780027760,
          processed_count: 4,
          rights_determined_count: 2,
          under_review_count: 1,
          failed_count: 1,
        },
      }),
    )

    const batch = await getProcessBatchStatus('batch-1')

    expect(batch).not.toBeNull()
    expect(batch?.pipelineRequestedStages).toEqual(['metadata-extraction', 'metadata-validation', 'rights-determinator'])
    expect(batch?.rightsDeterminator?.status).toBe('completed')
    expect(batch?.rightsDeterminator?.requestId).toBe('request-11')
    expect(batch?.rightsDeterminator?.rightsDeterminedCount).toBe(2)
    expect(batch?.rightsDeterminator?.underReviewCount).toBe(1)
  })

  it('records metadata extractor callback receipt under the metadata_extractor key', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        metadata_extractor: {
          status: 'completed',
          callback: {
            url: 'http://localhost/callback',
          },
        },
      }),
    )
    mockUpdate.mockResolvedValue(undefined)

    await markProcessStageCallbackReceived('batch-3', 'metadata_extractor', '2026-05-29T04:35:00.000Z')

    expect(getUpdatedProcessingDetails()).toEqual({
      metadata_extractor: {
        status: 'completed',
        callback: {
          url: 'http://localhost/callback',
          received_at: '2026-05-29T04:35:00.000Z',
        },
      },
    })
  })

  it('records metadata extractor completion on batch processing details', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requested_stages: ['metadata-extraction'],
        },
      }),
    )
    mockUpdate.mockResolvedValue(undefined)

    await recordMetadataExtractorCompletion('batch-4', {
      requestId: 'request-9',
      initiatedAt: '2026-05-29T04:40:00.000Z',
      completedAt: '2026-05-29T04:40:05.000Z',
      processedCount: 4,
      extractedCount: 3,
      failedCount: 1,
    })

    expect(getUpdatedProcessingDetails()).toEqual({
      pipeline: {
        requested_stages: ['metadata-extraction'],
      },
      metadata_extractor: {
        status: 'completed',
        request_id: 'request-9',
        requested_by_app: 'preserv-dashboard',
        initiated_at: '2026-05-29T04:40:00.000Z',
        started_at: '2026-05-29T04:40:00.000Z',
        completed_at: '2026-05-29T04:40:05.000Z',
        last_transition_at: '2026-05-29T04:40:05.000Z',
        processed_count: 4,
        extracted_count: 3,
        failed_count: 1,
        current_pass: 1,
        max_passes: 1,
        completed_passes: [1],
      },
    })
  })

  it('records metadata validator completion on batch processing details', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requested_stages: ['metadata-extraction', 'metadata-validation'],
        },
      }),
    )
    mockUpdate.mockResolvedValue(undefined)

    await recordMetadataValidatorCompletion('batch-5', {
      requestId: 'request-10',
      initiatedAt: '2026-05-29T04:45:00.000Z',
      completedAt: '2026-05-29T04:45:06.000Z',
      processedCount: 4,
      metadataValidatedCount: 3,
      underReviewCount: 1,
      failedCount: 0,
    })

    expect(getUpdatedProcessingDetails()).toEqual({
      pipeline: {
        requested_stages: ['metadata-extraction', 'metadata-validation'],
      },
      metadata_validator: {
        status: 'completed',
        request_id: 'request-10',
        requested_by_app: 'preserv-dashboard',
        initiated_at: '2026-05-29T04:45:00.000Z',
        started_at: '2026-05-29T04:45:00.000Z',
        completed_at: '2026-05-29T04:45:06.000Z',
        last_transition_at: '2026-05-29T04:45:06.000Z',
        processed_count: 4,
        metadata_validated_count: 3,
        under_review_count: 1,
        failed_count: 0,
        current_pass: 1,
        max_passes: 1,
        completed_passes: [1],
      },
    })
  })

  it('records rights determinator completion on batch processing details', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requested_stages: ['metadata-extraction', 'metadata-validation', 'rights-determinator'],
        },
      }),
    )
    mockUpdate.mockResolvedValue(undefined)

    await recordRightsDeterminatorCompletion('batch-6', {
      requestId: 'request-12',
      initiatedAt: '2026-05-29T04:50:00.000Z',
      completedAt: '2026-05-29T04:50:07.000Z',
      processedCount: 4,
      rightsDeterminedCount: 2,
      underReviewCount: 1,
      failedCount: 1,
    })

    expect(getUpdatedProcessingDetails()).toEqual({
      pipeline: {
        requested_stages: ['metadata-extraction', 'metadata-validation', 'rights-determinator'],
      },
      rights_determinator: {
        status: 'completed',
        request_id: 'request-12',
        requested_by_app: 'preserv-dashboard',
        initiated_at: '2026-05-29T04:50:00.000Z',
        started_at: '2026-05-29T04:50:00.000Z',
        completed_at: '2026-05-29T04:50:07.000Z',
        last_transition_at: '2026-05-29T04:50:07.000Z',
        processed_count: 4,
        rights_determined_count: 2,
        under_review_count: 1,
        failed_count: 1,
        current_pass: 1,
        max_passes: 1,
        completed_passes: [1],
      },
    })
  })
})
