import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockTransaction } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
}))

const { mockCreateEditHistoryEntry } = vi.hoisted(() => ({
  mockCreateEditHistoryEntry: vi.fn(),
}))

const { mockMarkDocumentBatchesPublicationLocked } = vi.hoisted(() => ({
  mockMarkDocumentBatchesPublicationLocked: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    $transaction: mockTransaction,
  },
}))

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: mockCreateEditHistoryEntry,
  markDocumentBatchesPublicationLocked: mockMarkDocumentBatchesPublicationLocked,
}))

import {
  applyReviewQueueDecision,
  ReviewQueueApprovalBlockedError,
  updateReviewQueueChecklist,
} from '@lib/queries/queries'
import type { ReviewHistoryValue } from 'types/reviewHistory'

interface MockTransactionClient {
  metadata: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  document_quality: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  document_to_metadata: {
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  document_access: {
    findMany: ReturnType<typeof vi.fn>
  }
  document_to_batches: {
    findMany: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  state_history: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

interface StateHistoryCreateArgs {
  data: {
    document_id: string
    previous_state: string | null
    new_state: string
    changed_at: Date
  }
}

interface DocumentQualityUpdateArgs {
  where: {
    document_id: string
  }
  data: {
    validation_status: string
    validation_timestamp: number
    validator_name?: string
    review_checklist?: string | null
  }
}

interface MetadataWriteArgs {
  where?: unknown
  update?: { value?: string; value_type?: string }
  create?: { value?: string; value_type?: string }
}

function parseReviewHistory(value: string | undefined): ReviewHistoryValue {
  return JSON.parse(value ?? '{}') as ReviewHistoryValue
}

function createTransactionClient(): MockTransactionClient {
  return {
    metadata: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    document_quality: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    document_to_metadata: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    document_access: {
      findMany: vi.fn(),
    },
    document_to_batches: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    state_history: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  }
}

describe('applyReviewQueueDecision', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('writes state history and updates document quality for approvals', async () => {
    const tx = createTransactionClient()
    tx.document_quality.findUnique.mockResolvedValue({ document_id: 'doc-1' })
    tx.state_history.findFirst.mockResolvedValue({ new_state: 'needs_review' })
    tx.state_history.create.mockResolvedValue({ id: 'state-1' })
    tx.document_quality.update.mockResolvedValue({ document_id: 'doc-1' })
    mockTransaction.mockImplementation(async (callback: (client: MockTransactionClient) => Promise<unknown>) =>
      callback(tx),
    )

    tx.document_quality.findUnique.mockResolvedValue({
      id: 'quality-approval-1',
      document_id: 'doc-1',
      validation_status: 'NEEDS_REVIEW',
      review_checklist: {
        metadataReviewed: true,
        rightsReviewed: false,
      },
    })
    tx.document_to_metadata.findFirst
      .mockResolvedValueOnce({
        id: 'active-review-1',
        value: JSON.stringify({ value: { legacy: ['Needs review.'] } }),
      })
      .mockResolvedValueOnce({
        id: 'history-link-1',
        metadata_id: 'meta-history',
        value: JSON.stringify({ value: { version: 1, episodes: [] } }),
      })
    tx.document_to_metadata.findMany.mockResolvedValue([
      { document_id: 'doc-1', value: JSON.stringify({ value: true }), metadata: { name: 'preservation_candidate' } },
      { document_id: 'doc-1', value: JSON.stringify({ value: 'A document' }), metadata: { name: 'dc_title' } },
      { document_id: 'doc-1', value: JSON.stringify({ value: '2025' }), metadata: { name: 'dc_date' } },
      { document_id: 'doc-1', value: JSON.stringify({ value: 'Report' }), metadata: { name: 'dc_type' } },
      { document_id: 'doc-1', value: JSON.stringify({ value: 'eng' }), metadata: { name: 'dc_language_iso' } },
      { document_id: 'doc-1', value: JSON.stringify({ value: 'Abstract' }), metadata: { name: 'dc_description_abstract' } },
      { document_id: 'doc-1', value: JSON.stringify({ value: 'Public domain' }), metadata: { name: 'dc_rights' } },
      { document_id: 'doc-1', value: JSON.stringify({ value: 'Indigenous peoples' }), metadata: { name: 'dc_subject_unesco' } },
    ])
    tx.document_access.findMany.mockResolvedValue([{ access_levels: { level_name: 'public' } }])
    tx.document_to_batches.findMany.mockImplementation(
      ({ where }: { where: { batches?: { lifecycle_status?: unknown } } }) =>
        where.batches?.lifecycle_status === 'draft' ? [] : [{ document_id: 'doc-1', processing_details: '{}' }],
    )
    tx.metadata.findFirst.mockResolvedValue({ id: 'meta-history' })
    tx.document_to_metadata.upsert.mockResolvedValue({ id: 'history-link-1' })
    tx.document_to_metadata.delete.mockResolvedValue({ id: 'active-review-1' })

    await applyReviewQueueDecision({
      documentId: 'doc-1',
      decision: 'APPROVED',
      validationTimestamp: 1747094400,
      validatorName: 'Maria Reviewer',
    })

    expect(tx.state_history.create).toHaveBeenCalledTimes(1)
    expect(tx.state_history.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        document_id: 'doc-1',
        previous_state: 'needs_review',
        new_state: 'approved',
      },
    })
    const stateHistoryCreateArgs = tx.state_history.create.mock.calls[0]?.[0] as StateHistoryCreateArgs | undefined
    expect(stateHistoryCreateArgs?.data.changed_at).toBeInstanceOf(Date)

    expect(tx.document_quality.update).toHaveBeenCalledWith({
      where: { document_id: 'doc-1' },
      data: {
        validation_status: 'APPROVED',
        validation_timestamp: 1747094400,
        validator_name: 'Maria Reviewer',
        review_checklist: null,
      },
    })
    expect(tx.document_to_metadata.delete).toHaveBeenCalledWith({ where: { id: 'active-review-1' } })
    const decisionChecklistHistory = mockCreateEditHistoryEntry.mock.calls[0]?.[1] as
      | {
          entityTable: string
          entityId: string
          previousValue: { review_checklist: Record<string, boolean> }
          newValue: { review_checklist: null }
        }
      | undefined
    expect(decisionChecklistHistory).toMatchObject({
      entityTable: 'document_quality',
      entityId: 'quality-approval-1',
      previousValue: { review_checklist: { metadataReviewed: true, rightsReviewed: false } },
      newValue: { review_checklist: null },
    })
    const metadataWriteArgs = tx.document_to_metadata.upsert.mock.calls[0]?.[0] as MetadataWriteArgs | undefined
    expect(metadataWriteArgs?.where).toEqual({
      document_id_metadata_id: { document_id: 'doc-1', metadata_id: 'meta-history' },
    })
    expect(metadataWriteArgs?.update?.value_type).toBe('json')
    const historyValue = parseReviewHistory(metadataWriteArgs?.update?.value)
    expect(historyValue.episodes).toHaveLength(1)
    expect(historyValue.episodes[0]).toMatchObject({
      decision: 'APPROVED',
      validation_status_before: 'NEEDS_REVIEW',
      resolved_by: 'Maria Reviewer',
      source: 'dashboard_decision',
      inferred: false,
    })
  })

  it('uses rejected state history values and leaves validator_name unchanged when unavailable', async () => {
    const tx = createTransactionClient()
    tx.document_quality.findUnique.mockResolvedValue({ document_id: 'doc-2', validation_status: 'METADATA_ISSUES' })
    tx.state_history.findFirst.mockResolvedValue(null)
    tx.state_history.create.mockResolvedValue({ id: 'state-2' })
    tx.document_quality.update.mockResolvedValue({ document_id: 'doc-2' })
    tx.document_to_metadata.findFirst.mockResolvedValue(null)
    tx.metadata.findFirst.mockResolvedValue(null)
    tx.metadata.create.mockResolvedValue({ id: 'meta-history-2' })
    tx.document_to_metadata.upsert.mockResolvedValue({ id: 'history-link-2' })
    tx.document_to_metadata.delete.mockResolvedValue({ id: 'active-review-2' })
    tx.document_to_batches.findMany.mockImplementation(
      ({ where }: { where: { batches?: { lifecycle_status?: unknown } } }) =>
        where.batches?.lifecycle_status === 'draft'
          ? [
              {
                id: 'draft-membership-2',
                batch_id: 'draft-2',
                document_id: 'doc-2',
                batch_origin: 'reprocessing_draft',
                processing_details: '{}',
              },
            ]
          : [],
    )
    mockTransaction.mockImplementation(async (callback: (client: MockTransactionClient) => Promise<unknown>) =>
      callback(tx),
    )

    await applyReviewQueueDecision({
      documentId: 'doc-2',
      decision: 'REJECTED',
      validationTimestamp: 1747094401,
    })

    expect(tx.state_history.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        document_id: 'doc-2',
        previous_state: null,
        new_state: 'rejected',
      },
    })
    expect(tx.document_quality.update.mock.calls[0]?.[0]).toMatchObject({
      where: { document_id: 'doc-2' },
      data: {
        validation_status: 'REJECTED',
        validation_timestamp: 1747094401,
      },
    })
    const documentQualityUpdateArgs = tx.document_quality.update.mock.calls[0]?.[0] as
      | DocumentQualityUpdateArgs
      | undefined
    expect(documentQualityUpdateArgs?.data.validator_name).toBeUndefined()
    const metadataCreateArgs = tx.metadata.create.mock.calls[0]?.[0] as
      | { data?: { id?: unknown; name?: unknown; notes?: unknown } }
      | undefined
    expect(metadataCreateArgs?.data?.name).toBe('needs_review_history')
    expect(typeof metadataCreateArgs?.data?.id).toBe('string')
    expect(typeof metadataCreateArgs?.data?.notes).toBe('string')
    expect(tx.document_to_metadata.delete).not.toHaveBeenCalled()
    expect(tx.document_to_batches.delete).toHaveBeenCalledWith({ where: { id: 'draft-membership-2' } })
    const metadataWriteArgs = tx.document_to_metadata.upsert.mock.calls[0]?.[0] as MetadataWriteArgs | undefined
    const historyValue = parseReviewHistory(metadataWriteArgs?.create?.value)
    expect(historyValue.episodes[0]).toMatchObject({
      decision: 'REJECTED',
      validation_status_before: 'METADATA_ISSUES',
      resolved_by: null,
    })
  })

  it('archives a derived reason when a status-only document is resolved', async () => {
    const tx = createTransactionClient()
    tx.document_quality.findUnique.mockResolvedValue({ document_id: 'doc-3', validation_status: 'NEEDS_REVIEW' })
    tx.state_history.findFirst.mockResolvedValue(null)
    tx.state_history.create.mockResolvedValue({ id: 'state-3' })
    tx.document_quality.update.mockResolvedValue({ document_id: 'doc-3' })
    tx.document_to_metadata.findFirst.mockResolvedValue(null)
    tx.document_to_metadata.findMany.mockResolvedValue([
      { document_id: 'doc-3', value: JSON.stringify({ value: true }), metadata: { name: 'preservation_candidate' } },
      { document_id: 'doc-3', value: JSON.stringify({ value: 'A document' }), metadata: { name: 'dc_title' } },
      { document_id: 'doc-3', value: JSON.stringify({ value: '2025' }), metadata: { name: 'dc_date' } },
      { document_id: 'doc-3', value: JSON.stringify({ value: 'Report' }), metadata: { name: 'dc_type' } },
      { document_id: 'doc-3', value: JSON.stringify({ value: 'eng' }), metadata: { name: 'dc_language_iso' } },
      { document_id: 'doc-3', value: JSON.stringify({ value: 'Abstract' }), metadata: { name: 'dc_description_abstract' } },
      { document_id: 'doc-3', value: JSON.stringify({ value: 'Public domain' }), metadata: { name: 'dc_rights' } },
      { document_id: 'doc-3', value: JSON.stringify({ value: 'Indigenous peoples' }), metadata: { name: 'dc_subject_unesco' } },
    ])
    tx.document_access.findMany.mockResolvedValue([{ access_levels: { level_name: 'public' } }])
    tx.document_to_batches.findMany.mockResolvedValue([{ document_id: 'doc-3', processing_details: '{}' }])
    tx.metadata.findFirst.mockResolvedValue({ id: 'meta-history-3' })
    tx.document_to_metadata.upsert.mockResolvedValue({ id: 'history-link-3' })
    mockTransaction.mockImplementation(async (callback: (client: MockTransactionClient) => Promise<unknown>) =>
      callback(tx),
    )

    await applyReviewQueueDecision({
      documentId: 'doc-3',
      decision: 'APPROVED',
      validationTimestamp: 1747094403,
      validatorName: null,
    })

    const metadataWriteArgs = tx.document_to_metadata.upsert.mock.calls[0]?.[0] as MetadataWriteArgs | undefined
    const historyValue = parseReviewHistory(metadataWriteArgs?.create?.value)
    expect(historyValue.episodes[0].reasons).toEqual([
      {
        serviceKey: 'review_queue',
        serviceLabel: 'Review Queue',
        reasons: ['Document requires human review.'],
      },
    ])
  })

  it('fails before writing history when the document quality record is missing', async () => {
    const tx = createTransactionClient()
    tx.document_quality.findUnique.mockResolvedValue(null)
    mockTransaction.mockImplementation(async (callback: (client: MockTransactionClient) => Promise<unknown>) =>
      callback(tx),
    )

    await expect(
      applyReviewQueueDecision({
        documentId: 'missing-doc',
        decision: 'APPROVED',
        validationTimestamp: 1747094402,
      }),
    ).rejects.toThrow('does not have a quality record')

    expect(tx.state_history.create).not.toHaveBeenCalled()
    expect(tx.document_quality.update).not.toHaveBeenCalled()
  })

  it('blocks approval when candidate readiness requirements are unmet', async () => {
    const tx = createTransactionClient()
    tx.document_quality.findUnique.mockResolvedValue({
      id: 'quality-blocked-1',
      document_id: 'doc-blocked',
      validation_status: 'NEEDS_REVIEW',
      review_checklist: null,
    })
    tx.document_to_metadata.findFirst.mockResolvedValue(null)
    tx.document_to_metadata.findMany.mockResolvedValue([
      { document_id: 'doc-blocked', value: JSON.stringify({ value: true }), metadata: { name: 'preservation_candidate' } },
      { document_id: 'doc-blocked', value: JSON.stringify({ value: 'A document' }), metadata: { name: 'dc_title' } },
    ])
    tx.document_access.findMany.mockResolvedValue([])
    tx.document_to_batches.findMany.mockResolvedValue([{ document_id: 'doc-blocked', processing_details: '{}' }])
    mockTransaction.mockImplementation(async (callback: (client: MockTransactionClient) => Promise<unknown>) =>
      callback(tx),
    )

    let approvalError: unknown
    try {
      await applyReviewQueueDecision({
        documentId: 'doc-blocked',
        decision: 'APPROVED',
        validationTimestamp: 1747094404,
      })
    } catch (error: unknown) {
      approvalError = error
    }

    if (!(approvalError instanceof ReviewQueueApprovalBlockedError)) {
      throw approvalError
    }

    expect(approvalError.unmetRequirements).toEqual(expect.arrayContaining(['dc_date', 'access_level']))
    expect(tx.state_history.create).not.toHaveBeenCalled()
    expect(tx.document_quality.update).not.toHaveBeenCalled()
    expect(tx.document_to_metadata.upsert).not.toHaveBeenCalled()
  })

  it('persists one checklist change and audits the previous and next state', async () => {
    const tx = createTransactionClient()
    tx.document_quality.findUnique.mockResolvedValue({
      id: 'quality-1',
      review_checklist: {
        metadataReviewed: false,
        rightsReviewed: true,
      },
    })
    tx.document_quality.update.mockResolvedValue({ id: 'quality-1' })
    mockTransaction.mockImplementation(async (callback: (client: MockTransactionClient) => Promise<unknown>) =>
      callback(tx),
    )

    await expect(
      updateReviewQueueChecklist({
        documentId: ' doc-1 ',
        itemKey: 'metadataReviewed',
        completed: true,
      }),
    ).resolves.toMatchObject({
      metadataReviewed: true,
      rightsReviewed: true,
      classificationReviewed: false,
    })

    expect(tx.document_quality.update).toHaveBeenCalledWith({
      where: { document_id: 'doc-1' },
      data: {
        review_checklist: JSON.stringify({
          metadataReviewed: true,
          rightsReviewed: true,
          classificationReviewed: false,
          duplicatesChecked: false,
          completenessReviewed: false,
        }),
      },
    })
    const checklistHistory = mockCreateEditHistoryEntry.mock.calls[0]?.[1] as
      | {
          entityTable: string
          entityId: string
          previousValue: { review_checklist: Record<string, boolean> }
          newValue: { review_checklist: Record<string, boolean> }
        }
      | undefined
    expect(checklistHistory).toMatchObject({
      entityTable: 'document_quality',
      entityId: 'quality-1',
      previousValue: { review_checklist: { metadataReviewed: false, rightsReviewed: true } },
      newValue: { review_checklist: { metadataReviewed: true, rightsReviewed: true } },
    })
  })
})
