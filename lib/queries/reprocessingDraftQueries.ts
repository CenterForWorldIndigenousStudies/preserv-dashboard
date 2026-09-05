import { Prisma, type PrismaClient } from '@lib/prisma/generated/client'

import { BATCH_LIFECYCLE_STATUSES } from '@constants/batchLifecycleStatuses'
import { BATCH_PUBLICATION_STATUSES } from '@constants/batchPublicationStatuses'
import { db } from '@lib/db'
import { createEditHistoryEntry } from '@lib/editHistory'
import { buildNameHash } from '@lib/tagHash'
import type { CallbackStageKey } from 'types/pipelineContracts'
import type {
  AddDocumentToReprocessingDraftInput,
  AddDocumentsToReprocessingDraftInput,
  CreateReprocessingDraftInput,
  CreateReprocessingDraftForDocumentsInput,
  ReprocessingDraftActionResult,
  ReprocessingDraftDetail,
  ReprocessingDraftDocument,
  ReprocessingDraftMembershipRemovalResult,
  ReprocessingDraftSummary,
  UpdateReprocessingDraftInput,
} from 'types/reprocessingDrafts'

type DraftQueryClient = PrismaClient | Prisma.TransactionClient

const REPROCESSABLE_START_STAGES = new Set<CallbackStageKey>([
  'document_splitter',
  'page_rotator',
  'ocr_processor',
  'content_dedup',
  'metadata_extractor',
  'metadata_validator',
  'rights_determinator',
])

const DRAFT_DETAILS_KEY = 'reprocessing_draft'

interface StoredDraftDetails {
  restart_stage?: unknown
  reason?: unknown
  collection_name?: unknown
  collection_notes?: unknown
  created_by?: unknown
  updated_by?: unknown
}

function parseDetails(value: string | null): Record<string, unknown> {
  if (!value?.trim()) return {}

  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function textValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function draftMetadata(details: Record<string, unknown>): StoredDraftDetails {
  const value = details[DRAFT_DETAILS_KEY]
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function restartStageValue(value: unknown): CallbackStageKey | null {
  return typeof value === 'string' && REPROCESSABLE_START_STAGES.has(value as CallbackStageKey)
    ? (value as CallbackStageKey)
    : null
}

function isoDate(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

function summaryFromRow(row: {
  id: string
  name: string | null
  processing_details: string | null
  created_at: Date | null
  updated_at: Date | null
  document_to_batches: unknown[]
}): ReprocessingDraftSummary {
  const metadata = draftMetadata(parseDetails(row.processing_details))
  const restartStage = restartStageValue(metadata.restart_stage)
  if (!restartStage) {
    throw new Error(`Draft batch ${row.id} has no valid restart stage.`)
  }

  return {
    id: row.id,
    name: row.name?.trim() || row.id,
    collectionName: textValue(metadata.collection_name),
    collectionNotes: textValue(metadata.collection_notes),
    restartStage,
    reason: textValue(metadata.reason) ?? '',
    documentCount: row.document_to_batches.length,
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
    createdBy: textValue(metadata.created_by),
    updatedBy: textValue(metadata.updated_by),
  }
}

function draftSelect() {
  return {
    id: true,
    name: true,
    processing_details: true,
    created_at: true,
    updated_at: true,
    document_to_batches: { select: { document_id: true } },
  } as const
}

async function lockRow(client: Prisma.TransactionClient, table: 'batches' | 'documents', id: string): Promise<void> {
  await client.$queryRaw(Prisma.sql`SELECT id FROM ${Prisma.raw(table)} WHERE id = ${id} FOR UPDATE`)
}

async function draftById(client: DraftQueryClient, batchId: string) {
  return client.batches.findFirst({
    where: { id: batchId, lifecycle_status: BATCH_LIFECYCLE_STATUSES.DRAFT },
    select: draftSelect(),
  })
}

function validateDraftInput(input: { name: string; reason: string; restartStage?: CallbackStageKey }): string | null {
  if (!input.name.trim()) return 'A batch name is required.'
  if (!input.reason.trim()) return 'A reason is required.'
  if (input.restartStage && !REPROCESSABLE_START_STAGES.has(input.restartStage)) {
    return 'Select a valid reprocessing start stage.'
  }
  return null
}

function buildDraftProcessingDetails(input: {
  restartStage: CallbackStageKey
  reason: string
  collectionName: string | null
  collectionNotes: string | null
  createdBy?: string | null
  updatedBy?: string | null
}): string {
  return JSON.stringify({
    reprocessing_draft: {
      restart_stage: input.restartStage,
      reason: input.reason,
      collection_name: input.collectionName,
      collection_notes: input.collectionNotes,
      created_by: input.createdBy ?? null,
      updated_by: input.updatedBy ?? input.createdBy ?? null,
    },
    pipeline: {
      execution_mode: 'reprocess',
      requested_stages: [input.restartStage],
    },
  })
}

function draftAuditValue(name: string | null, processingDetails: string | null): Record<string, unknown> {
  const metadata = draftMetadata(parseDetails(processingDetails))
  return {
    name: textValue(name),
    collection_name: textValue(metadata.collection_name),
    collection_notes: textValue(metadata.collection_notes),
    restart_stage: restartStageValue(metadata.restart_stage),
    reason: textValue(metadata.reason),
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function normalizeDocumentIds(documentIds: readonly string[]): string[] {
  return [...new Set(documentIds.map((documentId) => documentId.trim()).filter(Boolean))]
}

async function lockDocuments(client: Prisma.TransactionClient, documentIds: readonly string[]): Promise<void> {
  await [...documentIds]
    .sort()
    .reduce<
      Promise<void>
    >((previous, documentId) => previous.then(() => lockRow(client, 'documents', documentId)), Promise.resolve())
}

async function validateDraftDocuments(
  client: DraftQueryClient,
  documentIds: readonly string[],
): Promise<string | null> {
  const errors = await Promise.all(
    documentIds.map(async (documentId) => {
      const document = await client.documents.findUnique({ where: { id: documentId }, select: { id: true } })
      if (!document) return `Document ${documentId} could not be found.`
      return null
    }),
  )
  return errors.find((error): error is string => error !== null) ?? null
}

type DraftMembership = {
  id: string
  batch_id: string
  document_id: string
  batch_origin?: string | null
  processing_details?: string | null
}

async function getOpenDraftMemberships(
  client: DraftQueryClient,
  documentIds: readonly string[],
  excludedBatchId?: string,
): Promise<DraftMembership[]> {
  const normalizedDocumentIds = normalizeDocumentIds(documentIds)
  if (normalizedDocumentIds.length === 0) return []

  return client.document_to_batches.findMany({
    where: {
      document_id: { in: normalizedDocumentIds },
      batches: { lifecycle_status: BATCH_LIFECYCLE_STATUSES.DRAFT },
      ...(excludedBatchId ? { batch_id: { not: excludedBatchId } } : {}),
    },
    select: {
      id: true,
      batch_id: true,
      document_id: true,
      batch_origin: true,
      processing_details: true,
    },
  })
}

export async function removeOpenDraftMemberships(
  client: DraftQueryClient,
  documentIds: readonly string[],
  excludedBatchId?: string,
): Promise<string[]> {
  const memberships = await getOpenDraftMemberships(client, documentIds, excludedBatchId)

  await Promise.all(
    memberships.map(async (membership) => {
      await client.document_to_batches.delete({ where: { id: membership.id } })
      await createEditHistoryEntry(client, {
        entityTable: 'document_to_batches',
        entityId: membership.id,
        previousValue: membership,
        newValue: null,
        editSummary: `Removed document ${membership.document_id} from reprocessing draft ${membership.batch_id}.`,
      })
    }),
  )

  return [...new Set(memberships.map((membership) => membership.document_id))]
}

export async function getReprocessingDrafts(client: DraftQueryClient = db): Promise<ReprocessingDraftSummary[]> {
  const rows = await client.batches.findMany({
    where: { lifecycle_status: BATCH_LIFECYCLE_STATUSES.DRAFT },
    orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    select: draftSelect(),
  })
  return rows.map(summaryFromRow)
}

export async function getReprocessingDraft(
  batchId: string,
  client: DraftQueryClient = db,
): Promise<ReprocessingDraftDetail | null> {
  const row = await client.batches.findFirst({
    where: { id: batchId, lifecycle_status: BATCH_LIFECYCLE_STATUSES.DRAFT },
    select: {
      ...draftSelect(),
      document_to_batches: {
        orderBy: [{ added_at: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          added_at: true,
          documents: {
            select: {
              id: true,
              name: true,
              id_legacy: true,
              document_to_batches: {
                where: { batches: { lifecycle_status: { not: BATCH_LIFECYCLE_STATUSES.DRAFT } } },
                orderBy: [{ added_at: 'desc' }, { id: 'desc' }],
                take: 1,
                select: { batches: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  })
  if (!row) return null

  const summary = summaryFromRow(row)
  const documents: ReprocessingDraftDocument[] = row.document_to_batches.map((membership) => ({
    id: membership.documents.id,
    name: membership.documents.name,
    idLegacy: membership.documents.id_legacy,
    sourceBatchName: membership.documents.document_to_batches[0]?.batches.name ?? null,
    addedAt: isoDate(membership.added_at),
  }))
  return { ...summary, documents }
}

export async function getOpenDraftForDocument(
  documentId: string,
  client: DraftQueryClient = db,
): Promise<ReprocessingDraftSummary | null> {
  const row = await client.document_to_batches.findFirst({
    where: { document_id: documentId, batches: { lifecycle_status: BATCH_LIFECYCLE_STATUSES.DRAFT } },
    select: { batches: { select: draftSelect() } },
  })
  return row ? summaryFromRow(row.batches) : null
}

export async function getOpenDraftDocumentIds(
  documentIds: readonly string[],
  client: DraftQueryClient = db,
): Promise<string[]> {
  const normalizedDocumentIds = normalizeDocumentIds(documentIds)
  if (normalizedDocumentIds.length === 0) return []

  const rows = await client.document_to_batches.findMany({
    where: {
      document_id: { in: normalizedDocumentIds },
      batches: { lifecycle_status: BATCH_LIFECYCLE_STATUSES.DRAFT },
    },
    select: { document_id: true },
  })
  return [...new Set(rows.map((row) => row.document_id))]
}

export async function removeDocumentsFromReprocessingDrafts(
  documentIds: readonly string[],
): Promise<ReprocessingDraftMembershipRemovalResult> {
  const normalizedDocumentIds = normalizeDocumentIds(documentIds)
  if (normalizedDocumentIds.length === 0) return { ok: true, removedDocumentIds: [] }

  try {
    return await db.$transaction(async (tx) => {
      await lockDocuments(tx, normalizedDocumentIds)
      const removedDocumentIds = await removeOpenDraftMemberships(tx, normalizedDocumentIds)
      return { ok: true, removedDocumentIds }
    })
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The documents could not be removed from reprocessing drafts.',
    }
  }
}

export async function createReprocessingDraft(
  input: CreateReprocessingDraftInput,
): Promise<ReprocessingDraftActionResult> {
  return createReprocessingDraftForDocuments({ ...input, documentIds: [input.documentId] })
}

export async function createReprocessingDraftForDocuments(
  input: CreateReprocessingDraftForDocumentsInput,
): Promise<ReprocessingDraftActionResult> {
  const documentIds = normalizeDocumentIds(input.documentIds)
  const name = input.name.trim()
  const reason = input.reason.trim()
  const restartStage = input.restartStage
  const validationError =
    documentIds.length > 0 ? validateDraftInput({ name, reason, restartStage }) : 'A document is required.'
  if (validationError) return { ok: false, error: validationError }

  try {
    return await db.$transaction(async (tx) => {
      await lockDocuments(tx, documentIds)
      const documentValidationError = await validateDraftDocuments(tx, documentIds)
      if (documentValidationError) return { ok: false, error: documentValidationError }

      const nameHash = buildNameHash(name)
      const existingName = await tx.batches.findFirst({
        where: { OR: [{ name_hash: nameHash }, { name }] },
        select: { id: true },
      })
      if (existingName) return { ok: false, error: `Batch name “${name}” already exists.` }

      await removeOpenDraftMemberships(tx, documentIds)

      const batchId = crypto.randomUUID()
      await tx.batches.create({
        data: {
          id: batchId,
          name,
          started_by: input.createdBy ?? null,
          lifecycle_status: BATCH_LIFECYCLE_STATUSES.DRAFT,
          publication_status: BATCH_PUBLICATION_STATUSES.NOT_STARTED,
          processing_details: buildDraftProcessingDetails({
            restartStage,
            reason,
            collectionName: textValue(input.collectionName),
            collectionNotes: textValue(input.collectionNotes),
            createdBy: input.createdBy,
          }),
        },
      })
      await Promise.all(
        documentIds.map((documentId) =>
          tx.document_to_batches.create({
            data: {
              id: crypto.randomUUID(),
              document_id: documentId,
              batch_id: batchId,
              added_at: new Date(),
              batch_origin: 'reprocessing_draft',
              processing_details: '{}',
            },
          }),
        ),
      )
      await createEditHistoryEntry(tx, {
        entityTable: 'batches',
        entityId: batchId,
        previousValue: null,
        newValue: {
          name,
          lifecycle_status: BATCH_LIFECYCLE_STATUSES.DRAFT,
          restart_stage: restartStage,
          document_ids: documentIds,
        },
        editSummary: 'Created reprocessing draft batch.',
      })
      return { ok: true, batchId }
    })
  } catch (error: unknown) {
    return isUniqueConstraintError(error)
      ? { ok: false, error: `Batch name “${name}” already exists.` }
      : { ok: false, error: error instanceof Error ? error.message : 'The reprocessing draft could not be created.' }
  }
}

export async function addDocumentToReprocessingDraft(
  input: AddDocumentToReprocessingDraftInput,
): Promise<ReprocessingDraftActionResult> {
  return addDocumentsToReprocessingDraft({ ...input, documentIds: [input.documentId] })
}

export async function addDocumentsToReprocessingDraft(
  input: AddDocumentsToReprocessingDraftInput,
): Promise<ReprocessingDraftActionResult> {
  const batchId = input.batchId.trim()
  const documentIds = normalizeDocumentIds(input.documentIds)
  if (!batchId || documentIds.length === 0) return { ok: false, error: 'A draft and document are required.' }

  try {
    return await db.$transaction(async (tx) => {
      await lockRow(tx, 'batches', batchId)
      await lockDocuments(tx, documentIds)
      const draft = await draftById(tx, batchId)
      if (!draft) return { ok: false, error: 'The reprocessing draft is not editable.' }
      const documentValidationError = await validateDraftDocuments(tx, documentIds)
      if (documentValidationError) return { ok: false, error: documentValidationError }
      const existingDocumentIds = new Set(draft.document_to_batches.map((membership) => membership.document_id))
      const documentIdsToAdd = documentIds.filter((documentId) => !existingDocumentIds.has(documentId))
      await removeOpenDraftMemberships(tx, documentIdsToAdd, batchId)
      const memberships = await Promise.all(
        documentIdsToAdd.map((documentId) =>
          tx.document_to_batches.create({
            data: {
              id: crypto.randomUUID(),
              document_id: documentId,
              batch_id: batchId,
              added_at: new Date(),
              batch_origin: 'reprocessing_draft',
              processing_details: '{}',
            },
          }),
        ),
      )
      await Promise.all(
        memberships.map((membership, index) =>
          createEditHistoryEntry(tx, {
            entityTable: 'document_to_batches',
            entityId: membership.id,
            previousValue: null,
            newValue: membership,
            editSummary: `Added document ${documentIdsToAdd[index]} to reprocessing draft ${batchId}.`,
          }),
        ),
      )
      return { ok: true, batchId }
    })
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The document could not be added to the draft.',
    }
  }
}

export async function updateReprocessingDraft(
  input: UpdateReprocessingDraftInput,
): Promise<ReprocessingDraftActionResult> {
  const batchId = input.batchId.trim()
  const name = input.name.trim()
  const reason = input.reason.trim()
  const validationError = validateDraftInput({ name, reason })
  if (!batchId) return { ok: false, error: 'A draft batch is required.' }
  if (validationError) return { ok: false, error: validationError }

  try {
    return await db.$transaction(async (tx) => {
      await lockRow(tx, 'batches', batchId)
      const draft = await draftById(tx, batchId)
      if (!draft) return { ok: false, error: 'The reprocessing draft is not editable.' }
      const existingName = await tx.batches.findFirst({
        where: { id: { not: batchId }, OR: [{ name_hash: buildNameHash(name) }, { name }] },
        select: { id: true },
      })
      if (existingName) return { ok: false, error: `Batch name “${name}” already exists.` }
      const current = draftMetadata(parseDetails(draft.processing_details))
      const processingDetails = buildDraftProcessingDetails({
        restartStage: restartStageValue(current.restart_stage) ?? 'document_splitter',
        reason,
        collectionName: textValue(input.collectionName),
        collectionNotes: textValue(input.collectionNotes),
        createdBy: textValue(current.created_by),
        updatedBy: input.updatedBy,
      })
      const previousValue = draftAuditValue(draft.name, draft.processing_details)
      const newValue = draftAuditValue(name, processingDetails)
      await tx.batches.update({ where: { id: batchId }, data: { name, processing_details: processingDetails } })
      if (JSON.stringify(previousValue) !== JSON.stringify(newValue)) {
        await createEditHistoryEntry(tx, {
          entityTable: 'batches',
          entityId: batchId,
          previousValue,
          newValue,
          editSummary: 'Updated reprocessing draft batch details.',
        })
      }
      return { ok: true, batchId }
    })
  } catch (error: unknown) {
    return isUniqueConstraintError(error)
      ? { ok: false, error: `Batch name “${name}” already exists.` }
      : { ok: false, error: error instanceof Error ? error.message : 'The reprocessing draft could not be updated.' }
  }
}

export async function removeDocumentFromReprocessingDraft(
  batchId: string,
  documentId: string,
): Promise<ReprocessingDraftActionResult> {
  if (!batchId.trim() || !documentId.trim()) return { ok: false, error: 'A draft and document are required.' }
  return db.$transaction(async (tx) => {
    await lockRow(tx, 'batches', batchId.trim())
    const draft = await draftById(tx, batchId.trim())
    if (!draft) return { ok: false, error: 'The reprocessing draft is not editable.' }
    const membership = await tx.document_to_batches.findFirst({
      where: { batch_id: batchId.trim(), document_id: documentId.trim() },
    })
    if (!membership) return { ok: false, error: 'The document is not in this reprocessing draft.' }
    await tx.document_to_batches.delete({ where: { id: membership.id } })
    await createEditHistoryEntry(tx, {
      entityTable: 'document_to_batches',
      entityId: membership.id,
      previousValue: membership,
      newValue: null,
      editSummary: `Removed document ${documentId} from reprocessing draft ${batchId}.`,
    })
    return { ok: true, batchId: batchId.trim() }
  })
}

export async function archiveReprocessingDraft(batchId: string): Promise<ReprocessingDraftActionResult> {
  const normalizedBatchId = batchId.trim()
  if (!normalizedBatchId) return { ok: false, error: 'A draft batch is required.' }
  return db.$transaction(async (tx) => {
    await lockRow(tx, 'batches', normalizedBatchId)
    const draft = await draftById(tx, normalizedBatchId)
    if (!draft) return { ok: false, error: 'The reprocessing draft is not editable.' }
    await tx.batches.update({
      where: { id: normalizedBatchId },
      data: { lifecycle_status: BATCH_LIFECYCLE_STATUSES.ARCHIVE },
    })
    await createEditHistoryEntry(tx, {
      entityTable: 'batches',
      entityId: normalizedBatchId,
      previousValue: { lifecycle_status: BATCH_LIFECYCLE_STATUSES.DRAFT },
      newValue: { lifecycle_status: BATCH_LIFECYCLE_STATUSES.ARCHIVE },
      editSummary: 'Archived reprocessing draft batch.',
    })
    return { ok: true, batchId: normalizedBatchId }
  })
}
