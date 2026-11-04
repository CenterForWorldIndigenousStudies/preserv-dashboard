import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  batchFindUnique: vi.fn(),
  linksFindMany: vi.fn(),
  getEligibleReadyForLibraryDocumentIds: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    batches: { findUnique: mocks.batchFindUnique },
    document_to_batches: { findMany: mocks.linksFindMany },
  },
}))
vi.mock('@lib/queries/readyForLibraryQueries', () => ({
  getEligibleReadyForLibraryDocumentIds: mocks.getEligibleReadyForLibraryDocumentIds,
}))

import { getVerifiedPublicationContinuation } from '@lib/queries/readyForLibraryPublicationQueries'

describe('publication continuation', () => {
  it('requires one eligible candidate for each selected source in the new batch', async () => {
    mocks.batchFindUnique.mockResolvedValue({
      processing_details: JSON.stringify({
        pipeline: {
          workflow: 'ready_for_library_publish',
          selectedSourceDocumentIds: ['source-one', 'source-two'],
          publicationSourceCandidates: [{ sourceDocumentId: 'source-one', candidateDocumentId: 'candidate-one' }],
        },
      }),
    })
    mocks.linksFindMany.mockResolvedValue([{ document_id: 'candidate-one' }])
    mocks.getEligibleReadyForLibraryDocumentIds.mockResolvedValue(['candidate-one'])

    await expect(getVerifiedPublicationContinuation('publication-batch')).rejects.toThrow('exactly one')
  })

  it('returns exactly the verified new candidates and excludes original sources', async () => {
    mocks.batchFindUnique.mockResolvedValue({ processing_details: JSON.stringify({ pipeline: {
      workflow: 'ready_for_library_publish',
      selectedSourceDocumentIds: ['source-one', 'source-two'],
      publicationSourceCandidates: [
        { sourceDocumentId: 'source-one', candidateDocumentId: 'candidate-one' },
        { sourceDocumentId: 'source-two', candidateDocumentId: 'candidate-two' },
      ],
    } }) })
    mocks.linksFindMany.mockResolvedValue([
      { document_id: 'source-one' }, { document_id: 'candidate-one' },
      { document_id: 'source-two' }, { document_id: 'candidate-two' },
    ])
    mocks.getEligibleReadyForLibraryDocumentIds.mockResolvedValue(['candidate-one', 'candidate-two'])

    await expect(getVerifiedPublicationContinuation('publication-batch')).resolves.toEqual({ candidateIds: ['candidate-one', 'candidate-two'] })
  })

  it('rejects extra eligible output in the publication batch', async () => {
    mocks.batchFindUnique.mockResolvedValue({ processing_details: JSON.stringify({ pipeline: {
      workflow: 'ready_for_library_publish',
      selectedSourceDocumentIds: ['source-one'],
      publicationSourceCandidates: [{ sourceDocumentId: 'source-one', candidateDocumentId: 'candidate-one' }],
    } }) })
    mocks.linksFindMany.mockResolvedValue([{ document_id: 'candidate-one' }, { document_id: 'candidate-extra' }])
    mocks.getEligibleReadyForLibraryDocumentIds.mockResolvedValue(['candidate-one', 'candidate-extra'])

    await expect(getVerifiedPublicationContinuation('publication-batch')).rejects.toThrow('no longer match')
  })
})
