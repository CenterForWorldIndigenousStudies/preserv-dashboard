import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockEditHistoryFindFirst, mockFindUnique, mockUpdate, mockUpdateMany } = vi.hoisted(() => ({
  mockEditHistoryFindFirst: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateMany: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    batches: {
      findUnique: mockFindUnique,
      update: mockUpdate,
      updateMany: mockUpdateMany,
    },
    edit_history: {
      findFirst: mockEditHistoryFindFirst,
    },
  },
}))

import {
  getProcessBatchStatus,
  markProcessBatchComplete,
  markProcessStageCallbackReceived,
  recordMetadataExtractorCompletion,
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

function getUpdateArg(): {
  where: { id: string }
  data: Record<string, unknown>
} {
  expect(mockUpdate).toHaveBeenCalledTimes(1)
  const firstCall = mockUpdate.mock.calls[0] as [unknown] | undefined
  const updateArg = firstCall?.[0]
  expect(updateArg).toBeDefined()
  return updateArg as {
    where: { id: string }
    data: Record<string, unknown>
  }
}

describe('processBatches', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('marks only an active unpublished batch complete', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 })

    await markProcessBatchComplete('batch-1')

    expect(mockUpdateMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        id: 'batch-1',
        lifecycle_status: { in: ['queued', 'running'] },
      },
      data: {
        lifecycle_status: 'complete',
      },
    })
  })

  it('reports a post-start Dashboard edit as rollback ineligibility', async () => {
    const startedAt = new Date('2026-05-29T04:00:00.000Z')
    mockFindUnique.mockResolvedValue({
      ...buildBatchRow({ dataIngester: { status: 'completed' } }),
      started_at: startedAt,
      lifecycle_status: 'complete',
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
          requestedStages: ['document_splitter', 'page_rotator'],
        },
        dataIngester: {
          status: 'completed',
          requestId: 'request-1',
          requestedByApp: 'preserv-dashboard',
          initiatedAt: 1780027200,
          startedAt: 1780027205,
          completedAt: 1780027210,
          lastTransitionAt: 1780027210,
          processedCount: 12,
          ingestedCount: 11,
          duplicateCount: 1,
          skippedSameOriginCount: 1,
          callback: {
            deliveryStatus: 'failed',
            notifiedAt: 1780027211,
            httpStatus: 500,
            errorType: 'HTTPError',
            errorMessage: 'Internal Server Error',
          },
        },
        documentSplitterPass1: {
          status: 'completed',
          requestId: 'request-2',
          currentPass: 1,
          maxPasses: 2,
          completedPasses: [1],
          splitCount: 10,
          childCount: 12,
        },
        pageRotatorPass1: {
          status: 'queued',
          requestId: 'request-3',
          currentPass: 1,
          maxPasses: 2,
          completedPasses: [],
          rotatedCount: 0,
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

  it('exposes batch processing properties for progress surfaces', async () => {
    mockFindUnique.mockResolvedValue(buildBatchRow({ total_documents: 12, batch_statistics: { speed: 42 } }))

    const batch = await getProcessBatchStatus('batch-1')

    expect(batch?.processingProperties).toEqual([
      { key: 'total_documents', value: 12 },
      { key: 'batch_statistics', value: { speed: 42 } },
    ])
  })

  it('exposes legacy batches to the progress surface', async () => {
    mockFindUnique.mockResolvedValue({
      ...buildBatchRow({
        legacyImport: { status: 'historical', processingTimeSeconds: 321 },
      }),
      lifecycle_status: 'publication_locked',
      publication_target: 'fedora',
      batch_rollbacks: null,
    })

    const batch = await getProcessBatchStatus('batch-1')

    expect(batch?.pipelineExecutionMode).toBe('legacy_import')
    expect(batch?.legacyImportStatus).toBe('historical')
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

  it('infers completed splitter passes from pass-key statuses when completedPasses is absent', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requestedStages: ['document_splitter', 'page_rotator'],
        },
        documentSplitterPass1: {
          status: 'completed',
          requestId: 'request-2',
          currentPass: 1,
          maxPasses: 2,
          splitCount: 10,
          childCount: 12,
        },
      }),
    )

    const batch = await getProcessBatchStatus('batch-1')

    expect(batch).not.toBeNull()
    expect(batch?.documentSplitter?.status).toBe('completed')
    expect(batch?.documentSplitter?.completedPasses).toEqual([1])
  })

  it('records ingester callback receipt under the dataIngester key', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        dataIngester: {
          status: 'completed',
          callback: {
            url: 'http://localhost/callback',
          },
        },
      }),
    )
    mockUpdate.mockResolvedValue(undefined)

    await markProcessStageCallbackReceived('batch-1', 'data_ingester', '2026-05-29T04:25:48.015Z')

    expect(getUpdatedProcessingDetails()).toEqual({
      dataIngester: {
        status: 'completed',
        callback: {
          url: 'http://localhost/callback',
          receivedAt: '2026-05-29T04:25:48.015Z',
        },
      },
    })
  })

  it('records callback receipt on the latest page-rotator pass key', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pageRotatorPass1: {
          status: 'completed',
          callback: {
            url: 'http://localhost/callback',
          },
        },
        pageRotatorPass2: {
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
      pageRotatorPass1: {
        status: 'completed',
        callback: {
          url: 'http://localhost/callback',
        },
      },
      pageRotatorPass2: {
        status: 'running',
        callback: {
          url: 'http://localhost/callback',
          receivedAt: '2026-05-29T04:30:00.000Z',
        },
      },
    })
  })

  it('keeps a completed page-rotator callback batch live when OCR is still pending', async () => {
    mockFindUnique.mockResolvedValue({
      ...buildBatchRow({
        pipeline: {
          requestedStages: ['page_rotator', 'ocr_processor'],
          config: {
            profileId: 'custom',
            mode: 'custom',
            executionPlan: [
              {
                id: 'step-ingester',
                stepId: 'data_ingester',
                service: 'data_ingester',
                label: 'Ingest',
                order: 0,
                enabled: true,
              },
              {
                id: 'step-normalize-pass-1-rotate',
                stepId: 'page_rotator',
                service: 'page_rotator',
                label: 'Rotate Pass 1',
                order: 1,
                enabled: true,
                pass: 1,
                dependsOn: ['step-ingester'],
              },
              {
                id: 'step-ocr-processor',
                stepId: 'ocr_processor',
                service: 'ocr_processor',
                label: 'OCR Processor',
                order: 2,
                enabled: true,
                dependsOn: ['step-normalize-pass-1-rotate'],
              },
            ],
          },
        },
        dataIngester: {
          status: 'completed',
          completedAt: '2026-05-29T04:29:00.000Z',
        },
        pageRotatorPass1: {
          status: 'completed',
          currentPass: 1,
          maxPasses: 1,
          completedPasses: [1],
          reviewNeededCount: 1,
          completedAt: 1780029005,
          callback: {
            url: 'http://localhost/callback',
          },
        },
      }),
      started_at: new Date('2026-05-29T04:20:00.000Z'),
      lifecycle_status: 'running',
      publication_target: 'fedora',
      batch_rollbacks: null,
    })
    mockUpdate.mockResolvedValue(undefined)

    await markProcessStageCallbackReceived('batch-2', 'page_rotator', '2026-05-29T04:30:00.000Z')

    expect(getUpdatedProcessingDetails()).toMatchObject({
      pageRotatorPass1: {
        status: 'completed',
        reviewNeededCount: 1,
        callback: {
          url: 'http://localhost/callback',
          receivedAt: '2026-05-29T04:30:00.000Z',
        },
      },
    })
    expect(getUpdateArg()).toEqual({
      where: { id: 'batch-2' },
      data: {
        processing_details: JSON.stringify(getUpdatedProcessingDetails()),
      },
    })
  })

  it('parses metadata extractor details from processing details', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requestedStages: ['metadata_extractor'],
        },
        metadataExtractor: {
          status: 'completed',
          requestId: 'request-7',
          initiatedAt: 1780027500,
          completedAt: 1780027560,
          processedCount: 4,
        },
      }),
    )

    const batch = await getProcessBatchStatus('batch-1')

    expect(batch).not.toBeNull()
    expect(batch?.pipelineRequestedStages).toEqual(['metadata_extractor'])
    expect(batch?.metadataExtractor?.status).toBe('completed')
    expect(batch?.metadataExtractor?.requestId).toBe('request-7')
    expect(batch?.metadataExtractor?.processedCount).toBe(4)
  })

  it('parses metadata extractor openai batch wave summaries from processing details', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        pipeline: {
          requestedStages: ['metadata_extractor'],
          config: {
            profileId: 'custom',
            mode: 'custom',
            metadataExtraction: {
              mode: 'openai_batch',
            },
            executionPlan: [
              {
                id: 'step-ingester',
                stepId: 'data_ingester',
                service: 'data_ingester',
                label: 'Ingest',
                order: 0,
                enabled: true,
              },
              {
                id: 'step-metadata-extraction',
                stepId: 'metadata_extractor',
                service: 'metadata_extractor',
                label: 'Metadata Extraction',
                order: 1,
                enabled: true,
              },
            ],
          },
        },
        metadataExtractor: {
          status: 'in_progress',
          mode: 'openai_batch',
          openaiBatch: {
            wave1: {
              status: 'submitted',
              openaiBatchId: 'provider-batch-1',
              submittedAt: '2026-07-29T12:01:00.000Z',
              succeededCount: 0,
              failedCount: 0,
            },
            wave2: {
              status: 'not_started',
              processedCount: 0,
              succeededCount: 0,
              failedCount: 0,
            },
          },
        },
      }),
    )

    const batch = await getProcessBatchStatus('batch-1')
    if (!batch) {
      throw new Error('Expected a process batch status')
    }
    const extractor = batch.metadataExtractor

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

  it('records metadata extractor callback receipt under the metadataExtractor key', async () => {
    mockFindUnique.mockResolvedValue(
      buildBatchRow({
        metadataExtractor: {
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
      metadataExtractor: {
        status: 'completed',
        callback: {
          url: 'http://localhost/callback',
          receivedAt: '2026-05-29T04:35:00.000Z',
        },
      },
    })
  })

  it('records metadata extractor completion on batch processing details', async () => {
    mockFindUnique.mockResolvedValue({
      ...buildBatchRow({
        pipeline: {
          requestedStages: ['metadata_extractor'],
          config: {
            profileId: 'custom',
            mode: 'custom',
            executionPlan: [
              {
                id: 'step-ingester',
                stepId: 'data_ingester',
                service: 'data_ingester',
                label: 'Ingest',
                order: 0,
                enabled: true,
              },
              {
                id: 'step-metadata-extraction',
                stepId: 'metadata_extractor',
                service: 'metadata_extractor',
                label: 'Metadata Extraction',
                order: 1,
                enabled: true,
                dependsOn: ['step-ingester'],
              },
            ],
          },
        },
        dataIngester: {
          status: 'completed',
          completedAt: '2026-05-29T04:39:55.000Z',
        },
      }),
      started_at: new Date('2026-05-29T04:39:50.000Z'),
      lifecycle_status: 'running',
      publication_target: 'fedora',
      batch_rollbacks: null,
    })
    mockUpdate.mockResolvedValue(undefined)

    await recordMetadataExtractorCompletion('batch-4', {
      requestId: 'request-9',
      initiatedAt: '2026-05-29T04:40:00.000Z',
      completedAt: '2026-05-29T04:40:05.000Z',
      processedCount: 4,
      extractedCount: 3,
      failedCount: 1,
    })

    expect(getUpdatedProcessingDetails()).toMatchObject({
      pipeline: {
          requestedStages: ['metadata_extractor'],
      },
      metadataExtractor: {
        status: 'completed',
        requestId: 'request-9',
        requestedByApp: 'preserv-dashboard',
        initiatedAt: '2026-05-29T04:40:00.000Z',
        startedAt: '2026-05-29T04:40:00.000Z',
        completedAt: '2026-05-29T04:40:05.000Z',
        lastTransitionAt: '2026-05-29T04:40:05.000Z',
        processedCount: 4,
        extractedCount: 3,
        failedCount: 1,
        currentPass: 1,
        maxPasses: 1,
        completedPasses: [1],
      },
    })
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const updateCall = mockUpdate.mock.calls[0]?.[0] as { where?: { id?: string }; data?: { processing_details?: unknown } }
    expect(updateCall.where).toEqual({ id: 'batch-4' })
    expect(typeof updateCall.data?.processing_details).toBe('string')
  })

})
