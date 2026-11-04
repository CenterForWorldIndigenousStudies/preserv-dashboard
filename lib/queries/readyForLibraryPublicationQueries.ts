import { randomUUID } from 'node:crypto'

import { Prisma } from '@lib/prisma/generated/client'
import { db } from '@lib/db'
import { BATCH_ORIGINS } from '@constants/batchOrigins'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { buildNameHash } from '@lib/tagHash'
import { getEligibleReadyForLibraryDocumentIds } from '@lib/queries/readyForLibraryQueries'

export interface PublishReadyForLibraryInput {
  documentIds: readonly string[]
  name: string
  operationId: string
  startedBy: string
}

export type PublishReadyForLibraryResult =
  | { ok: true; batchId: string }
  | { ok: false; error: string }

export async function getReadyForLibrarySelectionNames(
  documentIds: readonly string[],
): Promise<Array<{ id: string; name: string }>> {
  const ids = [...new Set(documentIds.map((id) => id.trim()).filter(Boolean))]
  const rows = await db.documents.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  })
  return rows.map(({ id, name }) => ({ id, name: name || id })).sort((left, right) => left.id.localeCompare(right.id))
}

export async function getPublicationDraftForRetry(batchId: string): Promise<{
  name: string
  operationId: string
  documentIds: string[]
  requestedBy: string
} | null> {
  const attempt = await db.publication_attempts.findUnique({
    where: { batch_id: batchId },
    include: {
      batches: { select: { name: true, lifecycle_status: true, processing_details: true } },
      publication_source_claims: { select: { source_document_id: true } },
    },
  })
  if (!attempt || attempt.batches.lifecycle_status !== GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT) return null
  let details: unknown
  try {
    details = JSON.parse(attempt.batches.processing_details)
  } catch {
    return null
  }
  const pipeline = details && typeof details === 'object' && 'pipeline' in details ? details.pipeline : null
  if (!pipeline || typeof pipeline !== 'object' || !('workflow' in pipeline)
    || pipeline.workflow !== 'ready_for_library_publish') return null
  return {
    name: attempt.batches.name || batchId,
    operationId: attempt.operation_id,
    documentIds: attempt.publication_source_claims.map((claim) => claim.source_document_id),
    requestedBy: attempt.requested_by,
  }
}

export async function createPublicationBatchInTransaction(
  tx: Prisma.TransactionClient,
  input: PublishReadyForLibraryInput,
): Promise<PublishReadyForLibraryResult> {
  const documentIds = [...new Set(input.documentIds.map((id) => id.trim()).filter(Boolean))].sort()
  const name = input.name.trim()
  const operationId = input.operationId.trim()
  const startedBy = input.startedBy.trim()
  if (documentIds.length === 0) return { ok: false, error: 'Select at least one document to publish.' }
  if (!name) return { ok: false, error: 'A publication batch name is required.' }
  if (!operationId || !startedBy) return { ok: false, error: 'Publication identity is required.' }

  for (const documentId of documentIds) {
    // Sorted row locks ensure overlapping submissions serialize before eligibility checks.
    // eslint-disable-next-line no-await-in-loop
    await tx.$queryRaw(Prisma.sql`SELECT id FROM documents WHERE id = ${documentId} FOR UPDATE`)
  }

  const previous = await tx.publication_attempts.findUnique({
    where: { operation_id: operationId },
    include: { batches: { select: { name: true, processing_details: true } } },
  })
  if (previous) {
    const details: unknown = JSON.parse(previous.batches.processing_details)
    const pipeline = details && typeof details === 'object' && 'pipeline' in details ? details.pipeline : null
    const storedIds = pipeline && typeof pipeline === 'object' && 'selectedSourceDocumentIds' in pipeline
      ? pipeline.selectedSourceDocumentIds
      : null
    if (previous.requested_by !== startedBy || previous.batches.name !== name || JSON.stringify(storedIds) !== JSON.stringify(documentIds)) {
      return { ok: false, error: 'This publication operation was already used for another selection.' }
    }
    return { ok: true, batchId: previous.batch_id }
  }

  const eligibleIds = await getEligibleReadyForLibraryDocumentIds(documentIds, tx)
  if (eligibleIds.length !== documentIds.length) {
    return { ok: false, error: 'One or more selected documents are no longer Ready for Library.' }
  }
  const claimed = await tx.publication_source_claims.findMany({
    where: { source_document_id: { in: documentIds } },
    select: { source_document_id: true },
  })
  if (claimed.length > 0) return { ok: false, error: 'One or more documents already have an active publication attempt.' }
  const existingName = await tx.batches.findFirst({
    where: { OR: [{ name }, { name_hash: buildNameHash(name) }] },
    select: { id: true },
  })
  if (existingName) return { ok: false, error: `Batch name “${name}” already exists.` }

  const batchId = randomUUID()
  const attemptId = randomUUID()
  await tx.batches.create({
    data: {
      id: batchId,
      name,
      started_by: startedBy,
      lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT,
      processing_details: JSON.stringify({
        reason: 'Publish selected Ready for Library documents.',
        pipeline: {
          workflow: 'ready_for_library_publish',
          executionMode: 'reprocess',
          requestedStages: ['fedora_ingester'],
          selectedSourceDocumentIds: documentIds,
          operationId,
        },
      }),
    },
  })
  await tx.publication_attempts.create({ data: { id: attemptId, operation_id: operationId, batch_id: batchId, requested_by: startedBy } })
  await tx.publication_source_claims.createMany({
    data: documentIds.map((sourceDocumentId) => ({ id: randomUUID(), attempt_id: attemptId, source_document_id: sourceDocumentId })),
  })
  await tx.document_to_batches.createMany({
    data: documentIds.map((documentId) => ({
      id: randomUUID(), document_id: documentId, batch_id: batchId, added_at: new Date(), batch_origin: BATCH_ORIGINS.DRAFT,
      processing_details: '{}',
    })),
  })
  return { ok: true, batchId }
}

export async function publishReadyForLibraryDocuments(
  input: PublishReadyForLibraryInput,
): Promise<PublishReadyForLibraryResult> {
  try {
    return await db.$transaction((tx) => createPublicationBatchInTransaction(tx, input))
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'The publication batch could not be created.' }
  }
}

interface PublicationPair {
  sourceDocumentId: string
  candidateDocumentId: string
}

function isPublicationPair(value: unknown): value is PublicationPair {
  return Boolean(value && typeof value === 'object' && 'sourceDocumentId' in value
    && 'candidateDocumentId' in value && typeof value.sourceDocumentId === 'string'
    && typeof value.candidateDocumentId === 'string')
}

function parsePublicationMapping(pipeline: object): string[] {
  const sources: unknown = 'selectedSourceDocumentIds' in pipeline ? pipeline.selectedSourceDocumentIds : null
  const mapping: unknown = 'publicationSourceCandidates' in pipeline ? pipeline.publicationSourceCandidates : null
  if (!Array.isArray(sources) || !Array.isArray(mapping) || sources.length === 0 || mapping.length !== sources.length) {
    throw new Error('Every selected source must produce exactly one publication candidate.')
  }
  const sourceIds = (sources as unknown[]).filter((value): value is string => typeof value === 'string' && value.length > 0)
  const pairs = (mapping as unknown[]).filter(isPublicationPair)
  const candidateIds = pairs.map((pair) => pair.candidateDocumentId)
  if (
    sourceIds.length !== sources.length || pairs.length !== mapping.length
    || new Set(sourceIds).size !== sourceIds.length
    || new Set(pairs.map((pair) => pair.sourceDocumentId)).size !== sourceIds.length
    || pairs.some((pair) => !sourceIds.includes(pair.sourceDocumentId))
    || new Set(candidateIds).size !== candidateIds.length
  ) {
    throw new Error('Every selected source must produce exactly one publication candidate.')
  }
  return candidateIds
}

export async function getVerifiedPublicationContinuation(
  batchId: string,
): Promise<{ candidateIds: string[] } | null> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: { processing_details: true },
  })
  if (!batch) throw new Error(`Publication batch ${batchId} was not found.`)
  let details: unknown
  try {
    details = JSON.parse(batch.processing_details)
  } catch {
    throw new Error('Publication batch processing details are invalid.')
  }
  if (!details || typeof details !== 'object' || !('pipeline' in details)) return null
  const pipeline = details.pipeline
  if (!pipeline || typeof pipeline !== 'object' || !('workflow' in pipeline)) return null
  if (pipeline.workflow !== 'ready_for_library_publish') return null
  const candidateIds = parsePublicationMapping(pipeline)

  const batchLinks = await db.document_to_batches.findMany({
    where: { batch_id: batchId },
    select: { document_id: true },
  })
  const linkedIds = new Set(batchLinks.map((link) => link.document_id))
  if (candidateIds.some((id) => !linkedIds.has(id))) {
    throw new Error('A publication candidate is missing from its batch.')
  }
  const eligibleIds = await getEligibleReadyForLibraryDocumentIds([...linkedIds])
  if (eligibleIds.length !== candidateIds.length || eligibleIds.some((id) => !candidateIds.includes(id))) {
    throw new Error('Publication batch candidates no longer match the selected sources.')
  }
  return { candidateIds }
}
