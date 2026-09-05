import type { Prisma } from '@lib/prisma/generated/client'
import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest'
import { db } from '@lib/db'
import type { ReviewHistoryValue } from 'types/reviewHistory'

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
  markDocumentBatchesPublicationLocked: vi.fn(),
}))

import {
  applyReviewQueueDecisionInTransaction,
  getAllDocuments,
  getDocuments,
  getNeedsReviewDocuments,
  getNeedsReviewDocumentsCount,
  getReadyForLibraryDocuments,
} from '@lib/queries/queries'
import { resetTestDatabase, shouldSkipDashboardIntegrationSuite } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

const describeDbIntegration = shouldSkipDashboardIntegrationSuite() ? describe.skip : describe

describeDbIntegration('documents queries (integration)', () => {
  let sourceIdMetadataId: string
  let needsReviewMetadataId: string
  let preservationCandidateMetadataId: string
  let duplicateTagId: string
  let restrictedAccessLevelId: string

  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
    const [sourceMetadata, needsReviewMetadata, preservationCandidateMetadata, duplicateTag, accessLevels] =
      await Promise.all([
        db.metadata.findFirst({ where: { name: 'source_id' }, select: { id: true } }),
        db.metadata.findFirst({ where: { name: 'needs_review' }, select: { id: true } }),
        db.metadata.findFirst({ where: { name: 'preservation_candidate' }, select: { id: true } }),
        db.tags.findFirst({ where: { name: 'duplicate_document' }, select: { id: true } }),
        db.access_levels.findMany({ select: { id: true, level_name: true } }),
      ])
    const restrictedAccessLevel = accessLevels.find(
      (accessLevel) => accessLevel.level_name.toLowerCase() === 'restricted',
    )
    if (
      !sourceMetadata ||
      !needsReviewMetadata ||
      !preservationCandidateMetadata ||
      !duplicateTag ||
      !restrictedAccessLevel
    ) {
      throw new Error(
        'Expected source_id, needs_review, and preservation_candidate metadata, duplicate_document tag, and restricted access level to exist in integration DB',
      )
    }
    sourceIdMetadataId = sourceMetadata.id
    needsReviewMetadataId = needsReviewMetadata.id
    preservationCandidateMetadataId = preservationCandidateMetadata.id
    duplicateTagId = duplicateTag.id
    restrictedAccessLevelId = restrictedAccessLevel.id
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  // ---------------------------------------------------------------------------
  // ID generator — keeps values short enough for VarChar(36) fields
  // ---------------------------------------------------------------------------
  const makeIds = () => {
    const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    return { id: `d${ts}`, idLegacy: `l${ts}`, token: ts }
  }

  // ---------------------------------------------------------------------------
  // Helper: create a test document with retry on uniqueness collisions
  // ---------------------------------------------------------------------------
  const createTestDocument = async (
    tx: Prisma.TransactionClient,
    overrides: {
      id_legacy?: string
      name?: string
      hash_binary?: string
      hash_content?: string
      filesize?: bigint
      created_at?: Date
      updated_at?: Date
      preservation_candidate?: boolean
    } = {},
  ) => {
    let doc: { id: string } | null = null
    let lastErr: unknown
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const { id, idLegacy } = makeIds()
        // eslint-disable-next-line no-await-in-loop
        doc = await tx.documents.create({
          data: {
            id,
            id_legacy: overrides.id_legacy ?? idLegacy,
            name: overrides.name ?? `Test ${id}`,
            hash_binary: overrides.hash_binary ?? `hb-${id}`,
            hash_content: overrides.hash_content ?? `hc-${id}`,
            filesize: overrides.filesize ?? BigInt(1024),
            created_at: overrides.created_at ?? new Date(),
            updated_at: overrides.updated_at ?? new Date(),
          },
        })
        break
      } catch (err: unknown) {
        lastErr = err
      }
    }
    if (!doc) throw lastErr
    await tx.document_to_metadata.create({
      data: {
        id: `pc-${doc.id}`.slice(0, 36),
        document_id: doc.id,
        metadata_id: preservationCandidateMetadataId,
        value: JSON.stringify(overrides.preservation_candidate ?? true),
        value_type: 'boolean',
      },
    })
    return doc
  }

  describe('getNeedsReviewDocuments', () => {
    it('archives active review reasons when a decision resolves the episode', async () => {
      await withRollbackTransaction(async (tx) => {
        const document = await createTestDocument(tx, { name: 'Review Decision History Test' })
        const requiredReadinessMetadataNames = [
          'dc_title',
          'dc_date',
          'dc_type',
          'dc_language_iso',
          'dc_description_abstract',
          'dc_rights',
          'dc_subject_unesco',
        ]
        const existingReadinessMetadata = await tx.metadata.findMany({
          where: { name: { in: requiredReadinessMetadataNames } },
          select: { id: true, name: true },
        })
        const existingReadinessMetadataNames = new Set(existingReadinessMetadata.map(({ name }) => name))
        await Promise.all(
          requiredReadinessMetadataNames
            .filter((name) => !existingReadinessMetadataNames.has(name))
            .map((name) =>
              tx.metadata.create({
                data: {
                  id: `rdmd-${makeIds().token}`,
                  name,
                  notes: `Integration readiness fixture for ${name}.`,
                },
              }),
            ),
        )
        const readinessMetadata = await tx.metadata.findMany({
          where: { name: { in: requiredReadinessMetadataNames } },
          select: { id: true, name: true },
        })
        const publicAccessLevel = await tx.access_levels.findFirst({
          where: { level_name: 'public' },
          select: { id: true },
        })
        expect(readinessMetadata).toHaveLength(requiredReadinessMetadataNames.length)
        expect(publicAccessLevel).toBeDefined()
        if (!publicAccessLevel) {
          throw new Error('Expected public access level to exist in the integration database.')
        }

        await Promise.all([
          tx.document_access.create({
            data: {
              id: `rda-${makeIds().token}`,
              document_id: document.id,
              access_level_id: publicAccessLevel.id,
            },
          }),
          tx.document_to_metadata.createMany({
            data: readinessMetadata.map(({ id }) => ({
              id: `rdm-${makeIds().token}`,
              document_id: document.id,
              metadata_id: id,
              value: JSON.stringify('ready'),
              value_type: 'string',
            })),
          }),
        ])
        const historyMetadata =
          (await tx.metadata.findFirst({
            where: { name: 'needs_review_history' },
            select: { id: true },
          })) ??
          (await tx.metadata.create({
            data: {
              id: `nrhm-${makeIds().token}`,
              name: 'needs_review_history',
              notes: 'Integration history metadata.',
            },
            select: { id: true },
          }))

        await Promise.all([
          tx.document_quality.create({
            data: {
              id: `rdq-${document.id}`.slice(0, 36),
              document_id: document.id,
              validation_status: 'NEEDS_REVIEW',
            },
          }),
          tx.document_to_metadata.create({
            data: {
              id: `rdm-${document.id}`.slice(0, 36),
              document_id: document.id,
              metadata_id: needsReviewMetadataId,
              value: JSON.stringify({ value: { legacy: ['Review this document.'] } }),
              value_type: 'json',
            },
          }),
          tx.document_to_metadata.create({
            data: {
              id: `rdh-${document.id}`.slice(0, 36),
              document_id: document.id,
              metadata_id: historyMetadata.id,
              value: JSON.stringify({ value: { version: 1, episodes: [] } }),
              value_type: 'json',
            },
          }),
        ])

        await applyReviewQueueDecisionInTransaction(tx, {
          documentId: document.id,
          decision: 'APPROVED',
          validationTimestamp: 1747094400,
          validatorName: 'Integration Reviewer',
        })

        const activeMetadata = await tx.document_to_metadata.findFirst({
          where: {
            document_id: document.id,
            metadata: { name: 'needs_review' },
          },
          select: { id: true },
        })
        const history = await tx.document_to_metadata.findFirst({
          where: {
            document_id: document.id,
            metadata: { name: 'needs_review_history' },
          },
          select: { value: true },
        })
        const historyValue = JSON.parse(history?.value ?? '{}') as ReviewHistoryValue

        expect(activeMetadata).toBeNull()
        expect(historyValue.episodes).toHaveLength(1)
        expect(historyValue.episodes[0]).toMatchObject({
          decision: 'APPROVED',
          resolved_by: 'Integration Reviewer',
          validation_status_before: 'NEEDS_REVIEW',
          source: 'dashboard_decision',
          inferred: false,
        })
      })
    })

    it('includes active metadata candidates with status-aware filtering', async () => {
      await withRollbackTransaction(async (tx) => {
        const statusOnlyDocument = await createTestDocument(tx, { name: 'Status Only Review Candidate' })
        const metadataOnlyDocument = await createTestDocument(tx, { name: 'Metadata Only Review Candidate' })
        const formatErrorDocument = await createTestDocument(tx, { name: 'Format Error Review Candidate' })
        const generalErrorDocument = await createTestDocument(tx, { name: 'General Error Review Candidate' })
        const rejectedDocument = await createTestDocument(tx, { name: 'Rejected Review Candidate' })
        const staleAncestor = await createTestDocument(tx, {
          name: 'Stale Non Candidate Review Ancestor',
          preservation_candidate: false,
        })

        await tx.document_quality.createMany({
          data: [
            {
              id: `nq-status-${statusOnlyDocument.id}`.slice(0, 36),
              document_id: statusOnlyDocument.id,
              validation_status: 'NEEDS_REVIEW',
            },
            {
              id: `nq-format-${formatErrorDocument.id}`.slice(0, 36),
              document_id: formatErrorDocument.id,
              validation_status: 'FORMAT_ERRORS',
            },
            {
              id: `nq-general-${generalErrorDocument.id}`.slice(0, 36),
              document_id: generalErrorDocument.id,
              validation_status: 'GENERAL_ERRORS',
            },
            {
              id: `nq-rejected-${rejectedDocument.id}`.slice(0, 36),
              document_id: rejectedDocument.id,
              validation_status: 'REJECTED',
            },
            {
              id: `nq-stale-${staleAncestor.id}`.slice(0, 36),
              document_id: staleAncestor.id,
              validation_status: 'NEEDS_REVIEW',
            },
          ],
        })
        await tx.document_to_metadata.create({
          data: {
            id: `nrm-only-${metadataOnlyDocument.id}`.slice(0, 36),
            document_id: metadataOnlyDocument.id,
            metadata_id: needsReviewMetadataId,
            value: JSON.stringify({ value: { legacy: ['Metadata requires review.'] } }),
            value_type: 'json',
          },
        })
        await tx.document_to_metadata.createMany({
          data: [
            {
              id: `nrm-format-${formatErrorDocument.id}`.slice(0, 36),
              document_id: formatErrorDocument.id,
              metadata_id: needsReviewMetadataId,
              value: JSON.stringify({ value: { legacy: ['Format requires review.'] } }),
              value_type: 'json',
            },
            {
              id: `nrm-general-${generalErrorDocument.id}`.slice(0, 36),
              document_id: generalErrorDocument.id,
              metadata_id: needsReviewMetadataId,
              value: JSON.stringify({ value: { legacy: ['General error requires review.'] } }),
              value_type: 'json',
            },
          ],
        })
        await tx.document_to_metadata.create({
          data: {
            id: `nrm-stale-${staleAncestor.id}`.slice(0, 36),
            document_id: staleAncestor.id,
            metadata_id: needsReviewMetadataId,
            value: JSON.stringify({ value: { legacy: ['Stale ancestor review.'] } }),
            value_type: 'json',
          },
        })
        await tx.document_to_metadata.create({
          data: {
            id: `nrm-rejected-${rejectedDocument.id}`.slice(0, 36),
            document_id: rejectedDocument.id,
            metadata_id: needsReviewMetadataId,
            value: JSON.stringify({ value: { legacy: ['Rejected stale reason.'] } }),
            value_type: 'json',
          },
        })

        const defaultResult = await getNeedsReviewDocuments({ pageSize: 100 }, tx)
        const defaultIds = new Set(defaultResult.data.map((item) => item.id))
        expect([...defaultIds]).toEqual(
          expect.arrayContaining([
            metadataOnlyDocument.id,
            formatErrorDocument.id,
            generalErrorDocument.id,
          ]),
        )
        expect(defaultIds.has(statusOnlyDocument.id)).toBe(false)
        expect(defaultIds.has(rejectedDocument.id)).toBe(false)
        expect(defaultIds.has(staleAncestor.id)).toBe(false)
        expect(defaultResult.data.find((item) => item.id === metadataOnlyDocument.id)?.needs_review_reasons).toEqual([
          {
            serviceKey: 'legacy',
            serviceLabel: 'Legacy',
            reasons: ['Metadata requires review.'],
          },
        ])

        const needsReviewResult = await getNeedsReviewDocuments({ statuses: ['NEEDS_REVIEW'], pageSize: 100 }, tx)
        const needsReviewIds = new Set(needsReviewResult.data.map((item) => item.id))
        expect(needsReviewIds.has(statusOnlyDocument.id)).toBe(false)
        expect(needsReviewIds.has(metadataOnlyDocument.id)).toBe(false)
        expect(needsReviewIds.has(formatErrorDocument.id)).toBe(false)

        const formatErrorResult = await getNeedsReviewDocuments({ statuses: ['FORMAT_ERRORS'], pageSize: 100 }, tx)
        const formatErrorIds = new Set(formatErrorResult.data.map((item) => item.id))
        expect(formatErrorIds.has(formatErrorDocument.id)).toBe(true)
        expect(formatErrorIds.has(statusOnlyDocument.id)).toBe(false)
        expect(formatErrorIds.has(metadataOnlyDocument.id)).toBe(false)

        const generalErrorResult = await getNeedsReviewDocuments({ statuses: ['GENERAL_ERRORS'], pageSize: 100 }, tx)
        const generalErrorIds = new Set(generalErrorResult.data.map((item) => item.id))
        expect(generalErrorIds.has(generalErrorDocument.id)).toBe(true)
        expect(generalErrorIds.has(rejectedDocument.id)).toBe(false)

        const count = await getNeedsReviewDocumentsCount({ statuses: ['NEEDS_REVIEW'] }, tx)
        expect(count).toBe(0)
      })
    }, 15000)

    it('hydrates structured needs-review reasons from stored metadata', async () => {
      await withRollbackTransaction(async (tx) => {
        const document = await createTestDocument(tx, { name: 'Needs Review Reasons Test' })

        await Promise.all([
          tx.document_quality.create({
            data: {
              id: `nrq-${document.id}`.slice(0, 36),
              document_id: document.id,
              validation_status: 'NEEDS_REVIEW',
            },
          }),
          tx.document_to_metadata.create({
            data: {
              id: `nrm-${document.id}`.slice(0, 36),
              document_id: document.id,
              metadata_id: needsReviewMetadataId,
              value: JSON.stringify({
                value: {
                  document_splitter_1: ['Boundary requires review.'],
                },
              }),
              value_type: 'json',
            },
          }),
        ])

        const result = await getNeedsReviewDocuments({ pageSize: 100 }, tx)
        const found = result.data.find((item) => item.id === document.id)

        expect(found?.needs_review_reasons).toEqual([
          {
            serviceKey: 'document_splitter_1',
            serviceLabel: 'Document Splitter Pass 1',
            reasons: ['Boundary requires review.'],
          },
        ])
      })
    })

    it('excludes approved or published documents even when stale review metadata remains', async () => {
      await withRollbackTransaction(async (tx) => {
        const approvedDocument = await createTestDocument(tx, { name: 'Approved With Stale Review Metadata' })
        const publishedDocument = await createTestDocument(tx, { name: 'Published With Stale Review Metadata' })

        await tx.document_quality.createMany({
          data: [
            {
              id: `rq-approved-${approvedDocument.id}`.slice(0, 36),
              document_id: approvedDocument.id,
              validation_status: 'APPROVED',
            },
            {
              id: `rq-published-${publishedDocument.id}`.slice(0, 36),
              document_id: publishedDocument.id,
              validation_status: 'NEEDS_REVIEW',
            },
          ],
        })
        const publishedState = await tx.state_history.create({
          data: {
            id: `rqs-${publishedDocument.id}`.slice(0, 36),
            document_id: publishedDocument.id,
            previous_state: 'approved',
            new_state: 'ingested_fedora',
            changed_at: new Date('2026-08-01T12:00:00.000Z'),
          },
          select: { id: true },
        })
        await tx.document_quality.update({
          where: { document_id: publishedDocument.id },
          data: { current_status: publishedState.id },
        })
        await tx.document_to_metadata.createMany({
          data: [
            {
              id: `rqa-${approvedDocument.id}`.slice(0, 36),
              document_id: approvedDocument.id,
              metadata_id: needsReviewMetadataId,
              value: JSON.stringify({ value: { legacy: ['Stale approval reason.'] } }),
              value_type: 'json',
            },
            {
              id: `rqp-${publishedDocument.id}`.slice(0, 36),
              document_id: publishedDocument.id,
              metadata_id: needsReviewMetadataId,
              value: JSON.stringify({ value: { legacy: ['Stale publication reason.'] } }),
              value_type: 'json',
            },
          ],
        })

        const result = await getNeedsReviewDocuments({ pageSize: 100 }, tx)
        const resultIds = new Set(result.data.map((item) => item.id))

        expect(resultIds.has(approvedDocument.id)).toBe(false)
        expect(resultIds.has(publishedDocument.id)).toBe(false)
      })
    })
  })

  const createTestAuthor = async (tx: Prisma.TransactionClient, name: string): Promise<{ id: string }> => {
    const { token } = makeIds()
    const author = await tx.authors.create({
      data: {
        id: `a${token}`,
        name,
      },
      select: { id: true },
    })
    return author
  }

  const createTestBatch = async (tx: Prisma.TransactionClient, name: string): Promise<{ id: string }> => {
    const { token } = makeIds()
    const batch = await tx.batches.create({
      data: {
        id: `b${token}`,
        id_legacy: `legacy-${token}`,
        name,
        processing_details: JSON.stringify({}),
      },
      select: { id: true },
    })
    return batch
  }

  const createTestBatchWithOverrides = async (
    tx: Prisma.TransactionClient,
    overrides: {
      id_legacy?: string | null
      name?: string | null
    } = {},
  ): Promise<{ id: string; id_legacy: string | null; name: string | null }> => {
    const { token } = makeIds()
    return await tx.batches.create({
      data: {
        id: `b${token}`,
        id_legacy: overrides.id_legacy ?? `legacy-${token}`,
        name: overrides.name ?? `Batch ${token}`,
        processing_details: JSON.stringify({}),
      },
      select: { id: true, id_legacy: true, name: true },
    })
  }

  const createTestTag = async (tx: Prisma.TransactionClient, name: string): Promise<{ id: string }> => {
    const { token } = makeIds()
    const tag = await tx.tags.create({
      data: {
        id: `g${token}`,
        name,
      },
      select: { id: true },
    })
    return tag
  }

  const linkAuthorToDocument = async (
    tx: Prisma.TransactionClient,
    documentId: string,
    authorId: string,
  ): Promise<void> => {
    await tx.document_to_authors.create({
      data: {
        id: `da-${documentId}-${authorId}`.slice(0, 36),
        document_id: documentId,
        author_id: authorId,
      },
    })
  }

  // ---------------------------------------------------------------------------
  // getAllDocuments
  // ---------------------------------------------------------------------------
  describe('getAllDocuments', () => {
    it('returns documents with correct shape', async () => {
      await withRollbackTransaction(async (tx) => {
        const doc = await createTestDocument(tx, { name: 'Shape Test Doc' })

        const result = await getAllDocuments({}, tx)

        expect(result).toHaveProperty('data')
        expect(result).toHaveProperty('pageInfo')
        expect(Array.isArray(result.data)).toBe(true)
        expect(typeof result.pageInfo.page).toBe('number')

        const found = result.data.find((d) => d.id === doc.id)
        expect(found).toBeDefined()
        expect(found).toHaveProperty('id')
        expect(found).toHaveProperty('name')
        expect(found).toHaveProperty('filesize')
        expect(found).toHaveProperty('hash_binary')
        expect(found).toHaveProperty('hash_content')
        expect(found).toHaveProperty('id_legacy')
        expect(found).toHaveProperty('source_id')
        expect(found).toHaveProperty('created_at')
        expect(found).toHaveProperty('updated_at')
      })
    })

    it('paginates correctly with cursors', async () => {
      await withRollbackTransaction(async (tx) => {
        const batchName = 'CURSOR_PAGINATION_BATCH_20260514'
        const batch = await createTestBatch(tx, batchName)

        await Promise.all(
          Array.from({ length: 30 }, async (_, offset) => {
            const index = offset + 1
            const document = await createTestDocument(tx, {
              name: `CURSOR_PAGINATION_TEST_20260514_${String(index).padStart(2, '0')}`,
            })

            await tx.document_to_batches.create({
              data: {
                id: `db-${document.id}-${batch.id}`.slice(0, 36),
                document_id: document.id,
                batch_id: batch.id,
                processing_details: JSON.stringify({}),
              },
            })
          }),
        )

        const page1 = await getAllDocuments(
          {
            page: 1,
            pageSize: 25,
            batch: batchName,
            orderBy: 'name',
            sortDirection: 'asc',
          },
          tx,
        )
        const page2 = await getAllDocuments(
          {
            page: 2,
            pageSize: 25,
            batch: batchName,
            orderBy: 'name',
            sortDirection: 'asc',
            cursorValue: page1.pageInfo.endCursor?.value,
            cursorId: page1.pageInfo.endCursor?.id,
            cursorDirection: 'next',
          },
          tx,
        )

        expect(page1.data).toHaveLength(25)
        expect(page2.data).toHaveLength(5)
        expect(page1.pageInfo.hasNextPage).toBe(true)
        expect(page2.pageInfo.hasPreviousPage).toBe(true)

        const page1Batch = await tx.document_to_batches.findMany({
          where: { document_id: { in: page1.data.map((document) => document.id) } },
          select: { batch_id: true },
        })
        const page2Batch = await tx.document_to_batches.findMany({
          where: { document_id: { in: page2.data.map((document) => document.id) } },
          select: { batch_id: true },
        })
        expect(page1Batch.every((row) => row.batch_id === batch.id)).toBe(true)
        expect(page2Batch.every((row) => row.batch_id === batch.id)).toBe(true)

        const page1Ids = new Set(page1.data.map((d) => d.id))
        const overlap = page2.data.filter((d) => page1Ids.has(d.id))
        expect(overlap).toHaveLength(0)
      })
    })

    it('sorts by name ascending', async () => {
      await withRollbackTransaction(async (tx) => {
        await createTestDocument(tx, { name: 'Zebra Document' })
        await createTestDocument(tx, { name: 'Alpha Document' })
        await createTestDocument(tx, { name: 'Middle Document' })

        const result = await getAllDocuments(
          {
            orderBy: 'name',
            sortDirection: 'asc',
            pageSize: 100,
          },
          tx,
        )

        const ourDocs = result.data.filter((d) =>
          ['Zebra Document', 'Alpha Document', 'Middle Document'].includes(d.name ?? ''),
        )

        if (ourDocs.length >= 2) {
          const names = ourDocs.map((d) => d.name)
          const sorted = [...names].sort()
          expect(names).toEqual(sorted)
        }
      })
    })

    it('filters by author search term', async () => {
      await withRollbackTransaction(async (tx) => {
        const doc = await createTestDocument(tx, { name: 'UNIQUE_SEARCH_TERM_123xyz' })
        const author = await createTestAuthor(tx, 'UNIQUE_SEARCH_TERM_123xyz Author')
        await linkAuthorToDocument(tx, doc.id, author.id)

        const result = await getAllDocuments({ search: 'UNIQUE_SEARCH_TERM_123xyz' }, tx)

        const found = result.data.find((d) => d.id === doc.id)
        expect(found).toBeDefined()
      })
    })

    it('sorts by source_id ascending', async () => {
      await withRollbackTransaction(async (tx) => {
        const docA = await createTestDocument(tx, { name: 'SORT_PAIR_SOURCE A' })
        const docB = await createTestDocument(tx, { name: 'SORT_PAIR_SOURCE B' })
        const author = await createTestAuthor(tx, 'SORT_PAIR_SOURCE Author')
        await Promise.all([linkAuthorToDocument(tx, docA.id, author.id), linkAuthorToDocument(tx, docB.id, author.id)])

        await tx.document_to_metadata.createMany({
          data: [
            {
              id: `m-${docA.id}`,
              document_id: docA.id,
              metadata_id: sourceIdMetadataId,
              value: JSON.stringify({ value: 'ZZZ' }),
              value_type: 'string',
            },
            {
              id: `m-${docB.id}`,
              document_id: docB.id,
              metadata_id: sourceIdMetadataId,
              value: JSON.stringify({ value: 'AAA' }),
              value_type: 'string',
            },
          ],
        })

        const result = await getAllDocuments(
          {
            orderBy: 'source_id',
            sortDirection: 'asc',
            pageSize: 100,
            search: 'SORT_PAIR_SOURCE Author',
          },
          tx,
        )

        const ourDocs = result.data.filter((d) => ['SORT_PAIR_SOURCE A', 'SORT_PAIR_SOURCE B'].includes(d.name ?? ''))
        expect(ourDocs.map((d) => d.source_id)).toEqual(['AAA', 'ZZZ'])
      })
    }, 15000)

    it('sorts by is_duplicate descending', async () => {
      await withRollbackTransaction(async (tx) => {
        const plainDoc = await createTestDocument(tx, { name: 'SORT_PAIR_DUP Plain' })
        const duplicateDoc = await createTestDocument(tx, { name: 'SORT_PAIR_DUP Duplicate' })
        const author = await createTestAuthor(tx, 'SORT_PAIR_DUP Author')
        await Promise.all([
          linkAuthorToDocument(tx, plainDoc.id, author.id),
          linkAuthorToDocument(tx, duplicateDoc.id, author.id),
        ])

        await tx.document_to_tags.create({
          data: {
            id: `t-${duplicateDoc.id}`,
            document_id: duplicateDoc.id,
            tag_id: duplicateTagId,
          },
        })

        const result = await getAllDocuments(
          {
            orderBy: 'is_duplicate',
            sortDirection: 'desc',
            pageSize: 100,
            search: 'SORT_PAIR_DUP Author',
          },
          tx,
        )

        const ourDocs = result.data.filter((d) =>
          ['SORT_PAIR_DUP Plain', 'SORT_PAIR_DUP Duplicate'].includes(d.name ?? ''),
        )
        expect(ourDocs[0]?.name).toBe('SORT_PAIR_DUP Duplicate')
        expect(ourDocs[0]?.is_duplicate).toBe(true)
        expect(ourDocs[1]?.name).toBe('SORT_PAIR_DUP Plain')
        expect(ourDocs[1]?.is_duplicate).toBe(false)
      })
    }, 15000)

    it('applies advanced search filters together', async () => {
      await withRollbackTransaction(async (tx) => {
        const matchingDoc = await createTestDocument(tx, { name: 'ADVANCED_SEARCH_MATCH' })
        const nonMatchingDoc = await createTestDocument(tx, { name: 'ADVANCED_SEARCH_MISS' })
        const author = await createTestAuthor(tx, 'Mary Filter Person')
        const batch = await createTestBatch(tx, 'Overview Advanced Batch')
        const collectionTag = await createTestTag(tx, 'Overview Advanced Collection')

        await linkAuthorToDocument(tx, matchingDoc.id, author.id)
        await tx.document_to_batches.create({
          data: {
            id: `ab-${matchingDoc.id}`,
            document_id: matchingDoc.id,
            batch_id: batch.id,
            processing_details: JSON.stringify({}),
          },
        })
        await tx.document_quality.create({
          data: {
            id: `aq-${matchingDoc.id}`,
            document_id: matchingDoc.id,
            validation_status: 'APPROVED',
          },
        })
        await tx.document_to_tags.createMany({
          data: [
            {
              id: `at-${matchingDoc.id}`,
              document_id: matchingDoc.id,
              tag_id: collectionTag.id,
            },
            {
              id: `ad-${matchingDoc.id}`,
              document_id: matchingDoc.id,
              tag_id: duplicateTagId,
            },
          ],
        })

        await tx.document_access.create({
          data: {
            id: `da-${matchingDoc.id}`,
            document_id: matchingDoc.id,
            access_level_id: restrictedAccessLevelId,
          },
        })

        await tx.document_quality.create({
          data: {
            id: `aq-${nonMatchingDoc.id}`,
            document_id: nonMatchingDoc.id,
            validation_status: 'REJECTED',
          },
        })

        const result = await getAllDocuments(
          {
            pageSize: 100,
            search: 'Mary Filter',
            statuses: ['APPROVED'],
            documentType: 'duplicate',
            batch: 'Advanced Batch',
            collection: 'Overview Advanced Collection',
            accessLevel: 'restricted',
          },
          tx,
        )

        const resultIds = result.data.map((document) => document.id)
        expect(resultIds).toContain(matchingDoc.id)
        expect(resultIds).not.toContain(nonMatchingDoc.id)
      })
    }, 15000)

    it('searches Batch names without matching linked origins, legacy IDs, or metadata', async () => {
      await withRollbackTransaction(async (tx) => {
        const matchingDoc = await createTestDocument(tx, { name: 'BATCH_LINKED_MATCH' })
        const nonMatchingDoc = await createTestDocument(tx, { name: 'BATCH_LINKED_MISS' })
        const batch = await createTestBatchWithOverrides(tx, {
          id_legacy: 'registry-batch-legacy-20260514',
          name: null,
        })
        const legacyBatchOriginMetadata =
          (await tx.batch_metadata.findFirst({
            where: { name: 'legacy_batch_origin' },
            select: { id: true },
          })) ??
          (await tx.batch_metadata.create({
            data: {
              id: 'legacy-batch-origin-metadata-0001',
              name: 'legacy_batch_origin',
            },
            select: { id: true },
          }))

        await tx.document_to_batches.create({
          data: {
            id: `bo-${matchingDoc.id}`.slice(0, 36),
            document_id: matchingDoc.id,
            batch_id: batch.id,
            batch_origin: 'General Inventory Batch Origin',
            processing_details: JSON.stringify({}),
          },
        })
        await tx.batch_to_batches_metadata.create({
          data: {
            id: `bbm-${batch.id}`.slice(0, 36),
            batch_id: batch.id,
            batch_metadata_id: legacyBatchOriginMetadata.id,
            value: JSON.stringify('Historic Batch Origin Label'),
            value_type: 'string',
          },
        })

        const batchOriginResult = await getAllDocuments(
          {
            pageSize: 100,
            batch: 'Inventory Batch Origin',
          },
          tx,
        )

        const batchOriginIds = new Set(batchOriginResult.data.map((document) => document.id))
        expect(batchOriginIds.has(matchingDoc.id)).toBe(false)
        expect(batchOriginIds.has(nonMatchingDoc.id)).toBe(false)

        const batchLegacyResult = await getAllDocuments(
          {
            pageSize: 100,
            batch: 'legacy-20260514',
          },
          tx,
        )

        const batchLegacyIds = new Set(batchLegacyResult.data.map((document) => document.id))
        expect(batchLegacyIds.has(matchingDoc.id)).toBe(false)
        expect(batchLegacyIds.has(nonMatchingDoc.id)).toBe(false)

        const batchMetadataResult = await getAllDocuments(
          {
            pageSize: 100,
            batch: 'Historic Batch Origin',
          },
          tx,
        )

        const batchMetadataIds = new Set(batchMetadataResult.data.map((document) => document.id))
        expect(batchMetadataIds.has(matchingDoc.id)).toBe(false)
        expect(batchMetadataIds.has(nonMatchingDoc.id)).toBe(false)
      })
    }, 15000)

    it('filters by fuzzy-matched tags in advanced search', async () => {
      await withRollbackTransaction(async (tx) => {
        const matchingDoc = await createTestDocument(tx, { name: 'FUZZY_TAG_MATCH' })
        const nonMatchingDoc = await createTestDocument(tx, { name: 'FUZZY_TAG_MISS' })
        const matchingTag = await createTestTag(tx, 'aboriginal governance')
        const otherTag = await createTestTag(tx, 'coastal fisheries')

        await tx.document_to_tags.createMany({
          data: [
            {
              id: `ftm-${matchingDoc.id}`.slice(0, 36),
              document_id: matchingDoc.id,
              tag_id: matchingTag.id,
            },
            {
              id: `fto-${nonMatchingDoc.id}`.slice(0, 36),
              document_id: nonMatchingDoc.id,
              tag_id: otherTag.id,
            },
          ],
        })

        const result = await getAllDocuments(
          {
            pageSize: 100,
            tag: 'aborijinal',
          },
          tx,
        )

        const resultIds = new Set(result.data.map((document) => document.id))
        expect(resultIds.has(matchingDoc.id)).toBe(true)
        expect(resultIds.has(nonMatchingDoc.id)).toBe(false)
      })
    }, 15000)
  })

  describe('getReadyForLibraryDocuments', () => {
    it('filters ready candidates before returning the table result', async () => {
      await withRollbackTransaction(async (tx) => {
        const requiredMetadataNames = ['dc_title', 'dc_type', 'dc_subject', 'dc_rights']
        const existingMetadata = await tx.metadata.findMany({
          where: { name: { in: requiredMetadataNames } },
          select: { id: true, name: true },
        })
        const existingMetadataNames = new Set(existingMetadata.map(({ name }) => name))
        await Promise.all(
          requiredMetadataNames
            .filter((name) => !existingMetadataNames.has(name))
            .map((name) =>
              tx.metadata.create({
                data: {
                  id: `rfmd-${makeIds().token}`,
                  name,
                  notes: `Integration fixture definition for ${name}`,
                },
              }),
            ),
        )
        const requiredMetadata = await tx.metadata.findMany({
          where: { name: { in: requiredMetadataNames } },
          select: { id: true, name: true },
        })
        const openAccessLevel = await tx.access_levels.findFirst({
          where: { level_name: 'public' },
          select: { id: true },
        })

        expect(requiredMetadata).toHaveLength(4)
        expect(openAccessLevel).toBeDefined()
        if (!openAccessLevel) return

        const matchingDocument = await createTestDocument(tx, { name: 'READY_FILTER_MATCH' })
        const nonMatchingDocument = await createTestDocument(tx, { name: 'READY_FILTER_MISS' })
        const matchingAuthor = await createTestAuthor(tx, 'Matching Author')
        const otherAuthor = await createTestAuthor(tx, 'Different Author')
        const matchingBatch = await createTestBatch(tx, 'Ready Special RCR Writings September 25 2025')
        const otherBatch = await createTestBatch(tx, 'Ready Other Batch')

        await Promise.all([
          linkAuthorToDocument(tx, matchingDocument.id, matchingAuthor.id),
          linkAuthorToDocument(tx, nonMatchingDocument.id, otherAuthor.id),
          tx.document_to_batches.create({
            data: {
              id: `rfb-${matchingDocument.id}`.slice(0, 36),
              document_id: matchingDocument.id,
              batch_id: matchingBatch.id,
              processing_details: JSON.stringify({}),
            },
          }),
          tx.document_to_batches.create({
            data: {
              id: `rfb-${nonMatchingDocument.id}`.slice(0, 36),
              document_id: nonMatchingDocument.id,
              batch_id: otherBatch.id,
              processing_details: JSON.stringify({}),
            },
          }),
          tx.document_quality.create({
            data: {
              id: `rfq-${matchingDocument.id}`.slice(0, 36),
              document_id: matchingDocument.id,
              validation_status: 'APPROVED',
            },
          }),
          tx.document_quality.create({
            data: {
              id: `rfq-${nonMatchingDocument.id}`.slice(0, 36),
              document_id: nonMatchingDocument.id,
              validation_status: 'APPROVED',
            },
          }),
          tx.document_access.create({
            data: {
              id: `rfa-${matchingDocument.id}`.slice(0, 36),
              document_id: matchingDocument.id,
              access_level_id: openAccessLevel.id,
            },
          }),
          tx.document_access.create({
            data: {
              id: `rfa-${nonMatchingDocument.id}`.slice(0, 36),
              document_id: nonMatchingDocument.id,
              access_level_id: openAccessLevel.id,
            },
          }),
        ])

        await tx.document_to_metadata.createMany({
          data: requiredMetadata.flatMap(({ id: metadataId }) => [
            {
              id: `rfm-${matchingDocument.id}-${metadataId}`.slice(0, 36),
              document_id: matchingDocument.id,
              metadata_id: metadataId,
              value: JSON.stringify('ready'),
              value_type: 'string',
            },
            {
              id: `rfm-${nonMatchingDocument.id}-${metadataId}`.slice(0, 36),
              document_id: nonMatchingDocument.id,
              metadata_id: metadataId,
              value: JSON.stringify('ready'),
              value_type: 'string',
            },
          ]),
        })

        const result = await getReadyForLibraryDocuments(
          {
            page: 1,
            pageSize: 1,
            batch: 'Ready Special RCR Writngs September 25 2025',
          },
          tx,
        )

        expect(result.total).toBe(1)
        expect(result.items.map((item) => item.id)).toEqual([matchingDocument.id])
      })
    }, 15000)

    it('uses candidate-owned readiness data instead of an approved ancestor', async () => {
      await withRollbackTransaction(async (tx) => {
        const requiredMetadataNames = ['dc_title', 'dc_type', 'dc_subject', 'dc_rights']
        const requiredMetadata = await tx.metadata.findMany({
          where: { name: { in: requiredMetadataNames } },
          select: { id: true },
        })
        const openAccessLevel = await tx.access_levels.findFirst({
          where: { level_name: 'public' },
          select: { id: true },
        })
        expect(requiredMetadata).toHaveLength(4)
        expect(openAccessLevel).toBeDefined()
        if (!openAccessLevel) return

        const ancestor = await createTestDocument(tx, {
          name: 'Approved Non Candidate Ancestor',
          preservation_candidate: false,
        })
        const candidate = await createTestDocument(tx, { name: 'Approved Candidate Child' })

        await Promise.all([
          tx.document_quality.create({
            data: {
              id: `rfcq-${ancestor.id}`.slice(0, 36),
              document_id: ancestor.id,
              validation_status: 'APPROVED',
            },
          }),
          tx.document_quality.create({
            data: {
              id: `rfcq-${candidate.id}`.slice(0, 36),
              document_id: candidate.id,
              validation_status: 'APPROVED',
            },
          }),
          tx.document_access.create({
            data: {
              id: `rfca-${ancestor.id}`.slice(0, 36),
              document_id: ancestor.id,
              access_level_id: openAccessLevel.id,
            },
          }),
          tx.document_access.create({
            data: {
              id: `rfca-${candidate.id}`.slice(0, 36),
              document_id: candidate.id,
              access_level_id: openAccessLevel.id,
            },
          }),
        ])

        await tx.document_to_metadata.createMany({
          data: requiredMetadata.flatMap(({ id: metadataId }) => [
            {
              id: `rfcm-${ancestor.id}-${metadataId}`.slice(0, 36),
              document_id: ancestor.id,
              metadata_id: metadataId,
              value: JSON.stringify('ancestor value'),
              value_type: 'string',
            },
            {
              id: `rfcm-${candidate.id}-${metadataId}`.slice(0, 36),
              document_id: candidate.id,
              metadata_id: metadataId,
              value: JSON.stringify('candidate value'),
              value_type: 'string',
            },
          ]),
        })

        const result = await getReadyForLibraryDocuments({}, tx)

        expect(result.items.map((item) => item.id)).toEqual([candidate.id])
      })
    }, 15000)

    it('excludes approved documents whose latest state is ingested_fedora', async () => {
      await withRollbackTransaction(async (tx) => {
        const requiredMetadataNames = ['dc_title', 'dc_type', 'dc_subject', 'dc_rights']
        const existingMetadata = await tx.metadata.findMany({
          where: { name: { in: requiredMetadataNames } },
          select: { id: true, name: true },
        })
        const existingMetadataNames = new Set(existingMetadata.map(({ name }) => name))
        await Promise.all(
          requiredMetadataNames
            .filter((name) => !existingMetadataNames.has(name))
            .map((name) =>
              tx.metadata.create({
                data: {
                  id: `rflmd-${makeIds().token}`,
                  name,
                  notes: `Integration fixture definition for ${name}`,
                },
              }),
            ),
        )
        const requiredMetadata = await tx.metadata.findMany({
          where: { name: { in: requiredMetadataNames } },
          select: { id: true, name: true },
        })
        const openAccessLevel = await tx.access_levels.findFirst({
          where: { level_name: 'public' },
          select: { id: true },
        })
        expect(requiredMetadata).toHaveLength(4)
        expect(openAccessLevel).toBeDefined()
        if (!openAccessLevel) return

        const document = await createTestDocument(tx, { name: 'Already Uploaded Ready Candidate' })
        const uploadedState = await tx.state_history.create({
          data: {
            id: `rfls-${document.id}`.slice(0, 36),
            document_id: document.id,
            previous_state: 'approved',
            new_state: 'ingested_fedora',
            changed_at: new Date('2026-08-02T12:00:00.000Z'),
          },
          select: { id: true },
        })
        await tx.document_quality.create({
          data: {
            id: `rflq-${document.id}`.slice(0, 36),
            document_id: document.id,
            validation_status: 'APPROVED',
            current_status: uploadedState.id,
          },
        })
        await tx.document_access.create({
          data: {
            id: `rfla-${document.id}`.slice(0, 36),
            document_id: document.id,
            access_level_id: openAccessLevel.id,
          },
        })
        await tx.document_to_metadata.createMany({
          data: requiredMetadata.map(({ id: metadataId }) => ({
            id: `rflm-${document.id}-${metadataId}`.slice(0, 36),
            document_id: document.id,
            metadata_id: metadataId,
            value: JSON.stringify('ready'),
            value_type: 'string',
          })),
        })

        const result = await getReadyForLibraryDocuments({}, tx)

        expect(result.items.some((item) => item.id === document.id)).toBe(false)
      })
    })
  })

  // ---------------------------------------------------------------------------
  // getDocuments
  // ---------------------------------------------------------------------------
  describe('getDocuments', () => {
    it('returns items with correct shape', async () => {
      await withRollbackTransaction(async (tx) => {
        const doc = await createTestDocument(tx, { name: 'GetDocs Shape Test' })

        const result = await getDocuments({}, tx)

        expect(result).toHaveProperty('items')
        expect(result).toHaveProperty('total')
        expect(Array.isArray(result.items)).toBe(true)

        const found = result.items.find((d) => d.id === doc.id)
        expect(found).toBeDefined()
      })
    })

    it('paginates with PAGE_SIZE of 20', async () => {
      await withRollbackTransaction(async (tx) => {
        const inserts = Array.from({ length: 5 }, (_, i) => createTestDocument(tx, { name: `GetDocs Pagination ${i}` }))
        await Promise.all(inserts)

        const result = await getDocuments({ page: 1 }, tx)

        expect(result.items.length).toBeLessThanOrEqual(20)
      })
    })
  })
})
