import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@lib/db', () => ({
  db: {},
}))

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

import { getReviewQueueDocuments } from '@lib/queries'

interface ReviewQueueTestClient {
  metadata: {
    findFirst: ReturnType<typeof vi.fn>
  }
  $queryRaw: ReturnType<typeof vi.fn>
  document_to_metadata: {
    findMany: ReturnType<typeof vi.fn>
  }
  documents: {
    findMany: ReturnType<typeof vi.fn>
  }
}

function createClient(): ReviewQueueTestClient {
  return {
    metadata: {
      findFirst: vi.fn(),
    },
    $queryRaw: vi.fn(),
    document_to_metadata: {
      findMany: vi.fn(),
    },
    documents: {
      findMany: vi.fn(),
    },
  }
}

describe('getReviewQueueDocuments', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('builds queue reasons from validation and metadata flags', async () => {
    const client = createClient()

    client.metadata.findFirst
      .mockResolvedValueOnce({ id: 'meta-needs-review' })
      .mockResolvedValueOnce({ id: 'meta-sensitive' })
    client.$queryRaw.mockResolvedValueOnce([{ document_id: 'doc-1' }])
    client.document_to_metadata.findMany.mockResolvedValueOnce([
      { document_id: 'doc-1', metadata_id: 'meta-needs-review', value: 'true' },
      { document_id: 'doc-1', metadata_id: 'meta-sensitive', value: 'yes' },
      { document_id: 'doc-2', metadata_id: 'meta-sensitive', value: 'true' },
    ])
    client.documents.findMany.mockResolvedValueOnce([
      {
        id: 'doc-1',
        name: 'Alpha document',
        document_quality: {
          validation_status: 'IN_PROGRESS',
          validator_name: 'A Reviewer',
          validator_email: 'a@example.com',
        },
      },
      {
        id: 'doc-2',
        name: 'Sensitive document',
        document_quality: {
          validation_status: 'APPROVED',
          validator_name: null,
          validator_email: null,
        },
      },
    ])

    const result = await getReviewQueueDocuments({}, client as never)

    expect(result.total).toBe(2)
    expect(result.items[0]?.queue_reasons).toEqual([
      'Validation in progress',
      'Needs review metadata',
      'Sensitive metadata',
    ])
    expect(result.items[1]?.queue_reasons).toEqual(['Sensitive metadata'])
  })

  it('filters, sorts, and paginates the review queue server-side', async () => {
    const client = createClient()

    client.metadata.findFirst
      .mockResolvedValueOnce({ id: 'meta-needs-review' })
      .mockResolvedValueOnce({ id: 'meta-sensitive' })
    client.$queryRaw.mockResolvedValueOnce([{ document_id: 'doc-2' }])
    client.document_to_metadata.findMany.mockResolvedValueOnce([
      { document_id: 'doc-1', metadata_id: 'meta-needs-review', value: 'true' },
      { document_id: 'doc-2', metadata_id: 'meta-sensitive', value: 'true' },
      { document_id: 'doc-3', metadata_id: 'meta-needs-review', value: 'true' },
    ])
    client.documents.findMany.mockResolvedValueOnce([
      {
        id: 'doc-1',
        name: 'Gamma review',
        document_quality: {
          validation_status: 'APPROVED',
          validator_name: 'Maya Reviewer',
          validator_email: 'maya@example.com',
        },
      },
      {
        id: 'doc-2',
        name: 'Alpha review',
        document_quality: {
          validation_status: 'NEEDS_REVISION',
          validator_name: 'A Reviewer',
          validator_email: 'a@example.com',
        },
      },
      {
        id: 'doc-3',
        name: 'Beta review',
        document_quality: {
          validation_status: 'IN_PROGRESS',
          validator_name: 'B Reviewer',
          validator_email: 'b@example.com',
        },
      },
    ])

    const result = await getReviewQueueDocuments(
      {
        search: 'review',
        validationStatus: 'progress',
        needsReview: true,
        sensitive: false,
        sortBy: 'name',
        sortDirection: 'desc',
        page: 1,
        pageSize: 1,
      },
      client as never,
    )

    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe('doc-3')
  })

  it('ignores false-like metadata values when building the queue', async () => {
    const client = createClient()

    client.metadata.findFirst
      .mockResolvedValueOnce({ id: 'meta-needs-review' })
      .mockResolvedValueOnce({ id: 'meta-sensitive' })
    client.$queryRaw.mockResolvedValueOnce([])
    client.document_to_metadata.findMany.mockResolvedValueOnce([
      { document_id: 'doc-1', metadata_id: 'meta-needs-review', value: 'false' },
      { document_id: 'doc-2', metadata_id: 'meta-sensitive', value: '{"value": false}' },
      { document_id: 'doc-3', metadata_id: 'meta-needs-review', value: '0' },
    ])

    const result = await getReviewQueueDocuments({}, client as never)

    expect(client.documents.findMany).not.toHaveBeenCalled()
    expect(result).toEqual({ items: [], total: 0 })
  })
})
