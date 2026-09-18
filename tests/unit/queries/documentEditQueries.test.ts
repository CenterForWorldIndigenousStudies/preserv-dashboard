import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb, mockCreateDocumentEditHistoryEntry, mockMarkDocumentBatchesPublicationLocked } = vi.hoisted(() => ({
  mockDb: { $transaction: vi.fn() },
  mockCreateDocumentEditHistoryEntry: vi.fn(),
  mockMarkDocumentBatchesPublicationLocked: vi.fn(),
}))

vi.mock('@lib/db', () => ({ db: mockDb }))
vi.mock('@lib/editHistory', () => ({
  createDocumentEditHistoryEntry: mockCreateDocumentEditHistoryEntry,
  markDocumentBatchesPublicationLocked: mockMarkDocumentBatchesPublicationLocked,
}))

import {
  applyDocumentEdit,
  authorizeDocumentEditing,
  DocumentEditValidationError,
} from '@lib/queries/documentEditQueries'
import { isEditableDocumentMetadataField } from '@constants/documentEditing'

describe('applyDocumentEdit validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects protected and misspelled fields before opening a transaction', async () => {
    expect(isEditableDocumentMetadataField('rudolph_ryser_detected')).toBe(false)
    await expect(
      applyDocumentEdit({
        documentId: 'doc-1',
        editorEmail: 'editor@example.test',
        snapshot: {
          accessLevel: null,
          metadata: { rudolph_ryser_detected: true },
          quality: { comment: null, commentAdditional: null },
          tags: [],
          removedTagIds: [],
          deleteTagIds: [],
          contributors: [],
          publishers: [],
        },
      }),
    ).rejects.toBeInstanceOf(DocumentEditValidationError)

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('updates metadata, audits the change, and locks associated batches once', async () => {
    const tx = {
      documents: { findUnique: vi.fn().mockResolvedValue({ id: 'doc-1' }) },
      document_to_metadata: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            {
              id: 'document-metadata-1',
              value: JSON.stringify({ value: 'Before' }),
              value_type: 'string',
              metadata: { name: 'dc_title' },
            },
          ]),
        upsert: vi.fn(),
      },
      document_quality: { findUnique: vi.fn().mockResolvedValue(null) },
      document_access: { findMany: vi.fn().mockResolvedValue([]) },
      access_levels: { findUnique: vi.fn() },
      document_to_tags: { findMany: vi.fn().mockResolvedValue([]) },
      document_to_contributors: { findMany: vi.fn().mockResolvedValue([]) },
      document_to_publishers: { findMany: vi.fn().mockResolvedValue([]) },
      metadata: { findFirst: vi.fn().mockResolvedValue({ id: 'metadata-title' }), create: vi.fn() },
    }
    mockDb.$transaction.mockImplementationOnce(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    )

    const result = await applyDocumentEdit({
      documentId: 'doc-1',
      editorEmail: 'editor@example.test',
      snapshot: {
        accessLevel: null,
        metadata: { dc_title: 'After' },
        quality: { comment: null, commentAdditional: null },
        tags: [],
        contributors: [],
        publishers: [],
      },
    })

    expect(result.changed).toBe(true)
    expect(result.changes).toEqual([
      expect.objectContaining({ fieldName: 'dc_title', previousValue: 'Before', newValue: 'After' }),
    ])
    expect(tx.document_to_metadata.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { document_id_metadata_id: { document_id: 'doc-1', metadata_id: 'metadata-title' } },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        update: expect.objectContaining({
          value: JSON.stringify({ value: 'After' }),
          value_type: 'string',
        }),
      }),
    )
    expect(mockCreateDocumentEditHistoryEntry).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        documentId: 'doc-1',
        fieldName: 'dc_title',
        previousValue: 'Before',
        newValue: 'After',
        editorEmail: 'editor@example.test',
      }),
    )
    expect(mockMarkDocumentBatchesPublicationLocked).toHaveBeenCalledWith(tx, 'doc-1')
  })

  it('does not write audit history or lock batches for a no-op save', async () => {
    const tx = {
      documents: { findUnique: vi.fn().mockResolvedValue({ id: 'doc-1' }) },
      document_to_metadata: { findMany: vi.fn().mockResolvedValue([]) },
      document_quality: { findUnique: vi.fn().mockResolvedValue(null) },
      document_access: { findMany: vi.fn().mockResolvedValue([]) },
      access_levels: { findUnique: vi.fn() },
      document_to_tags: { findMany: vi.fn().mockResolvedValue([]) },
      document_to_contributors: { findMany: vi.fn().mockResolvedValue([]) },
      document_to_publishers: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mockDb.$transaction.mockImplementationOnce(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    )

    await expect(
      applyDocumentEdit({
        documentId: 'doc-1',
        editorEmail: 'editor@example.test',
        snapshot: {
          accessLevel: null,
          metadata: {},
          quality: { comment: null, commentAdditional: null },
          tags: [],
          contributors: [],
          publishers: [],
        },
      }),
    ).resolves.toEqual({ changed: false, changes: [] })

    expect(mockCreateDocumentEditHistoryEntry).not.toHaveBeenCalled()
    expect(mockMarkDocumentBatchesPublicationLocked).not.toHaveBeenCalled()
  })

  it('updates the access level, audits the change, and locks associated batches', async () => {
    const tx = {
      documents: { findUnique: vi.fn().mockResolvedValue({ id: 'doc-1' }) },
      document_to_metadata: { findMany: vi.fn().mockResolvedValue([]) },
      document_quality: { findUnique: vi.fn().mockResolvedValue(null) },
      document_access: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'document-access-1', access_level_id: 'restricted-id', access_levels: { level_name: 'restricted' } },
        ]),
        delete: vi.fn(),
        create: vi.fn(),
      },
      access_levels: {
        findUnique: vi.fn().mockResolvedValue({ id: 'public-id', level_name: 'public' }),
      },
      document_to_tags: { findMany: vi.fn().mockResolvedValue([]) },
      document_to_contributors: { findMany: vi.fn().mockResolvedValue([]) },
      document_to_publishers: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mockDb.$transaction.mockImplementationOnce(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    )

    const result = await applyDocumentEdit({
      documentId: 'doc-1',
      editorEmail: 'editor@example.test',
      snapshot: {
        accessLevel: 'public',
        metadata: {},
        quality: { comment: null, commentAdditional: null },
        tags: [],
        contributors: [],
        publishers: [],
      },
    })

    expect(result.changes).toEqual([
      expect.objectContaining({ fieldName: 'access_level', previousValue: 'restricted', newValue: 'public' }),
    ])
    expect(tx.document_access.delete).toHaveBeenCalledWith({ where: { id: 'document-access-1' } })
    expect(tx.document_access.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          document_id: 'doc-1',
          access_level_id: 'public-id',
          granted_by_email: 'editor@example.test',
        }),
      }),
    )
    expect(mockCreateDocumentEditHistoryEntry).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        fieldName: 'access_level',
        previousValue: 'restricted',
        newValue: 'public',
      }),
    )
    expect(mockMarkDocumentBatchesPublicationLocked).toHaveBeenCalledWith(tx, 'doc-1')
  })
})

describe('authorizeDocumentEditing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks an approved document as needing review, appends the reason, and records both histories', async () => {
    const tx = {
      documents: { findUnique: vi.fn().mockResolvedValue({ id: 'doc-1' }) },
      document_quality: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'quality-1',
          validation_status: 'APPROVED',
          current_status: 'state-1',
          state_history: { new_state: 'approved' },
        }),
        update: vi.fn(),
      },
      document_to_batches: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
      document_to_metadata: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'needs-review-link',
          metadata_id: 'needs-review-definition',
          value: JSON.stringify({ value: { ocr_processor: ['OCR output needs review.'] } }),
        }),
        update: vi.fn(),
      },
      state_history: { create: vi.fn().mockResolvedValue({ id: 'state-2' }) },
      metadata: { findFirst: vi.fn() },
    }
    mockDb.$transaction.mockImplementationOnce(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    )

    const result = await authorizeDocumentEditing({
      documentId: 'doc-1',
      editorEmail: 'editor@example.test',
      reason: 'Correct the title before approving again.',
    })

    expect(result).toEqual({ changed: true, previousState: 'approved', newState: 'needs_review' })
    expect(tx.document_to_metadata.update).toHaveBeenCalledWith({
      where: { id: 'needs-review-link' },
      data: {
        value: JSON.stringify({
          value: {
            ocr_processor: ['OCR output needs review.'],
            document_edit: ['Correct the title before approving again.'],
          },
        }),
        value_type: 'json',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        updated_at: expect.any(Date),
      },
    })
    expect(tx.state_history.create).toHaveBeenCalledWith({
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.any(String),
        document_id: 'doc-1',
        previous_state: 'approved',
        new_state: 'needs_review',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        changed_at: expect.any(Date),
      },
      select: { id: true },
    })
    expect(tx.document_quality.update).toHaveBeenCalledWith({
      where: { document_id: 'doc-1' },
      data: {
        current_status: 'state-2',
        validation_status: 'NEEDS_REVIEW',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        validation_timestamp: expect.any(Number),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        updated_at: expect.any(Date),
      },
    })
    expect(mockCreateDocumentEditHistoryEntry).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        documentId: 'doc-1',
        fieldName: 'needs_review',
        editorEmail: 'editor@example.test',
        newValue: {
          ocr_processor: ['OCR output needs review.'],
          document_edit: ['Correct the title before approving again.'],
        },
      }),
    )
  })
})
