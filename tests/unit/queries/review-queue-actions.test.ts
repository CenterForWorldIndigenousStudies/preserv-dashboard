import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockTransaction } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    $transaction: mockTransaction,
  },
}))

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

import { applyReviewQueueDecision } from '@lib/queries'

interface MockTransactionClient {
  document_quality: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  state_history: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

function createTransactionClient(): MockTransactionClient {
  return {
    document_quality: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
    tx.state_history.findFirst.mockResolvedValue({ new_state: 'under_review' })
    tx.state_history.create.mockResolvedValue({ id: 'state-1' })
    tx.document_quality.update.mockResolvedValue({ document_id: 'doc-1' })
    mockTransaction.mockImplementation(async (callback: (client: MockTransactionClient) => Promise<unknown>) => callback(tx))

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
        previous_state: 'under_review',
        new_state: 'approved',
      },
    })
    expect(tx.state_history.create.mock.calls[0]?.[0].data.changed_at).toBeInstanceOf(Date)

    expect(tx.document_quality.update).toHaveBeenCalledWith({
      where: { document_id: 'doc-1' },
      data: {
        validation_status: 'APPROVED',
        validation_timestamp: 1747094400,
        validator_name: 'Maria Reviewer',
      },
    })
  })

  it('uses rejected state history values and leaves validator_name unchanged when unavailable', async () => {
    const tx = createTransactionClient()
    tx.document_quality.findUnique.mockResolvedValue({ document_id: 'doc-2' })
    tx.state_history.findFirst.mockResolvedValue(null)
    tx.state_history.create.mockResolvedValue({ id: 'state-2' })
    tx.document_quality.update.mockResolvedValue({ document_id: 'doc-2' })
    mockTransaction.mockImplementation(async (callback: (client: MockTransactionClient) => Promise<unknown>) => callback(tx))

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
    expect(tx.document_quality.update.mock.calls[0]?.[0].data.validator_name).toBeUndefined()
  })

  it('fails before writing history when the document quality record is missing', async () => {
    const tx = createTransactionClient()
    tx.document_quality.findUnique.mockResolvedValue(null)
    mockTransaction.mockImplementation(async (callback: (client: MockTransactionClient) => Promise<unknown>) => callback(tx))

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
})
