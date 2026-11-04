import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getDashboardSession: vi.fn(),
  getReadyForLibrarySelectionNames: vi.fn(),
  getPublicationDraftForRetry: vi.fn(),
  publishReadyForLibraryDocuments: vi.fn(),
  triggerDataIngesterReprocess: vi.fn(),
}))

vi.mock('@root/auth', () => ({ getDashboardSession: mocks.getDashboardSession }))
vi.mock('@lib/queries/readyForLibraryPublicationQueries', () => ({
  publishReadyForLibraryDocuments: mocks.publishReadyForLibraryDocuments,
  getReadyForLibrarySelectionNames: mocks.getReadyForLibrarySelectionNames,
  getPublicationDraftForRetry: mocks.getPublicationDraftForRetry,
}))
vi.mock('@lib/pipelineTriggers', () => ({ triggerDataIngesterReprocess: mocks.triggerDataIngesterReprocess }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { getReadyForLibrarySelectionAction, publishReadyForLibraryAction, retryPublicationDraftAction } from '@actions/ready-for-library'

describe('publishReadyForLibraryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDashboardSession.mockResolvedValue({ user: { email: 'operator@example.org' } })
    mocks.publishReadyForLibraryDocuments.mockResolvedValue({ ok: true, batchId: 'publication-batch' })
    mocks.triggerDataIngesterReprocess.mockResolvedValue({ batchId: 'publication-batch', status: 'queued' })
  })

  it('queues only selected source IDs through Data Ingester with the fixed Fedora continuation', async () => {
    const result = await publishReadyForLibraryAction({
      documentIds: ['doc-two', 'doc-one'], name: 'My publication', operationId: 'operation-one',
    })

    expect(result).toMatchObject({ ok: true, batchId: 'publication-batch' })
    expect(mocks.publishReadyForLibraryDocuments).toHaveBeenCalledWith({
      documentIds: ['doc-two', 'doc-one'], name: 'My publication', operationId: 'operation-one', startedBy: 'operator@example.org',
    })
    expect(mocks.triggerDataIngesterReprocess).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 'publication-batch' }),
      expect.objectContaining({
        sourceDocumentIds: ['doc-one', 'doc-two'],
        requestedStages: ['fedora_ingester'],
        executionMode: 'reprocess',
      }),
    )
  })

  it('requires authentication before claiming documents', async () => {
    mocks.getDashboardSession.mockResolvedValue(null)
    expect((await publishReadyForLibraryAction({
      documentIds: ['doc-one'], name: 'My publication', operationId: 'operation-one',
    })).ok).toBe(false)
    expect(mocks.publishReadyForLibraryDocuments).not.toHaveBeenCalled()
  })

  it('loads the exact selected document names for confirmation across pages', async () => {
    mocks.getReadyForLibrarySelectionNames.mockResolvedValue([
      { id: 'doc-one', name: 'First document' },
      { id: 'doc-two', name: 'Second document' },
    ])
    expect(await getReadyForLibrarySelectionAction(['doc-two', 'doc-one'])).toEqual([
      { id: 'doc-one', name: 'First document' },
      { id: 'doc-two', name: 'Second document' },
    ])
    expect(mocks.getReadyForLibrarySelectionNames).toHaveBeenCalledWith(['doc-two', 'doc-one'])
  })

  it('retries an inspectable draft using its persisted source set and operation', async () => {
    mocks.getPublicationDraftForRetry.mockResolvedValue({
      name: 'My publication', operationId: 'operation-one',
      documentIds: ['doc-one'], requestedBy: 'operator@example.org',
    })
    expect(await retryPublicationDraftAction('publication-batch')).toMatchObject({ ok: true, batchId: 'publication-batch' })
    expect(mocks.publishReadyForLibraryDocuments).toHaveBeenCalledWith({
      name: 'My publication', operationId: 'operation-one',
      documentIds: ['doc-one'], startedBy: 'operator@example.org',
    })
  })
})
