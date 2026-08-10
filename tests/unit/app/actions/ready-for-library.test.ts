import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetDashboardSession,
  mockGetReadyForLibraryBatchIds,
  mockGetReadyForLibraryDocuments,
  mockGetProcessBatchStatus,
  mockTriggerFedoraIngester,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockGetReadyForLibraryBatchIds: vi.fn(),
  mockGetReadyForLibraryDocuments: vi.fn(),
  mockGetProcessBatchStatus: vi.fn(),
  mockTriggerFedoraIngester: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@constants/paths', () => ({
  READY_FOR_LIBRARY_PATH: '/ready-for-library',
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

vi.mock('@lib/queries/queries', () => ({
  getReadyForLibraryBatchIds: mockGetReadyForLibraryBatchIds,
  getReadyForLibraryDocuments: mockGetReadyForLibraryDocuments,
}))

vi.mock('@lib/processBatches', () => ({
  getProcessBatchStatus: mockGetProcessBatchStatus,
}))

vi.mock('@lib/pipelineTriggers', () => ({
  triggerFedoraIngester: mockTriggerFedoraIngester,
}))

import { getReadyForLibraryAction, triggerReadyForLibraryAction } from '@actions/ready-for-library'

describe('triggerReadyForLibraryAction', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('queues each eligible batch once and skips handoffs already started', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'operator@example.org' } })
    mockGetReadyForLibraryDocuments.mockResolvedValue({
      items: [{ id: 'doc-1' }, { id: 'doc-2' }],
      total: 2,
    })
    mockGetReadyForLibraryBatchIds.mockResolvedValue(['batch-1', 'batch-2'])
    mockGetProcessBatchStatus.mockImplementation((batchId: string) => ({
      batchId,
      startedBy: 'original@example.org',
      lifecycleStatus: 'completed',
      publicationStatus: 'not_started',
      fedoraIngester: batchId === 'batch-2' ? { status: 'queued' } : null,
    }))

    const result = await triggerReadyForLibraryAction()

    expect(result).toMatchObject({
      ok: true,
      eligibleDocumentCount: 2,
      queuedBatchCount: 1,
      skippedBatchCount: 1,
    })
    expect(mockTriggerFedoraIngester).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 'batch-1', startedBy: 'operator@example.org' }),
    )
    expect(mockTriggerFedoraIngester).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/ready-for-library')
  })

  it('requires an authenticated dashboard user before resolving handoff targets', async () => {
    mockGetDashboardSession.mockResolvedValue(null)

    const result = await triggerReadyForLibraryAction()

    expect(result).toMatchObject({ ok: false, error: 'Authentication required.' })
    expect(mockGetReadyForLibraryDocuments).not.toHaveBeenCalled()
    expect(mockGetReadyForLibraryBatchIds).not.toHaveBeenCalled()
  })
})

describe('getReadyForLibraryAction', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('forwards table filters to the ready-for-library query', async () => {
    const query = {
      author: 'Author',
      statuses: ['APPROVED'],
      collection: 'Collection',
    }
    mockGetReadyForLibraryDocuments.mockResolvedValue({ items: [], total: 0 })

    await getReadyForLibraryAction(query)

    expect(mockGetReadyForLibraryDocuments).toHaveBeenCalledWith(query)
  })
})
