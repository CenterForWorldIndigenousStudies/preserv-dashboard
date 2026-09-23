import { Prisma, type PrismaClient } from '@lib/prisma/generated/client'

import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'
import { BATCH_ORIGINS } from '@constants/batchOrigins'
import {
  DATA_INGESTER_SERVICE,
  FEDORA_INGESTER_SERVICE,
  SUPPORTED_DOWNSTREAM_SERVICES,
} from '@constants/pipeline'
import { db } from '@lib/db'
import { createEditHistoryEntry } from '@lib/editHistory'
import { buildNameHash } from '@lib/tagHash'
import {
  getReprocessingPipelineConfig,
  normalizeReprocessingRequestedStages,
} from '@lib/reprocessingDrafts'
import { createDefaultDraft, draftToPipelineConfig, parsePipelineConfig, type PipelineConfig } from '@lib/pipelineConfig'
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
import type { CreateBatchDraftInput } from 'types/batchDrafts'

type DraftQueryClient = PrismaClient | Prisma.TransactionClient

const REPROCESSABLE_START_STAGES = new Set<CallbackStageKey>([
  DATA_INGESTER_SERVICE,
  ...SUPPORTED_DOWNSTREAM_SERVICES,
])

interface StoredCollectionDetails {
  name?: unknown
  notes?: unknown
}

interface StoredBatchDraftDetails {
  reason?: unknown
  collection?: StoredCollectionDetails | null
  pipeline?: Record<string, unknown>
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

function draftDetails(details: Record<string, unknown>): StoredBatchDraftDetails {
  return details
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function pipelineRequestedStages(details: Record<string, unknown>): unknown {
  const pipeline = details.pipeline
  return pipeline && typeof pipeline === 'object' && !Array.isArray(pipeline)
    ? (pipeline as Record<string, unknown>).requestedStages
    : undefined
}

function pipelineConfig(details: Record<string, unknown>): PipelineConfig | undefined {
  const pipelineRecord =
    details.pipeline && typeof details.pipeline === 'object' && !Array.isArray(details.pipeline)
      ? (details.pipeline as Record<string, unknown>)
      : undefined
  const value = pipelineRecord?.config
  return parsePipelineConfig(value) ?? undefined
}

function collectionDetails(details: Record<string, unknown>): StoredCollectionDetails {
  const collection = draftDetails(details).collection
  return collection && typeof collection === 'object' && !Array.isArray(collection) ? collection : {}
}

function restartStageValue(value: unknown): CallbackStageKey | null {
  const stage = callbackStageValue(value)
  return stage && REPROCESSABLE_START_STAGES.has(stage) ? stage : null
}

function callbackStageValue(value: unknown): CallbackStageKey | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replaceAll('-', '_')
  return REPROCESSABLE_START_STAGES.has(normalized as CallbackStageKey) || normalized === FEDORA_INGESTER_SERVICE
    ? (normalized as CallbackStageKey)
    : null
}

function requestedStagesValue(value: unknown, restartStage: CallbackStageKey): CallbackStageKey[] {
  const requestedStages = Array.isArray(value)
    ? value.flatMap((stage) => {
        const normalized = callbackStageValue(stage)
        return normalized ? [normalized] : []
      })
    : []
  if (restartStage === DATA_INGESTER_SERVICE) {
    return requestedStages.length > 0 ? requestedStages : [restartStage]
  }
  const normalized = normalizeReprocessingRequestedStages(restartStage, requestedStages)
  return normalized.length > 0 ? normalized : [restartStage]
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
  const details = parseDetails(row.processing_details)
  const pipeline = pipelineConfig(details)
  const storedRequestedStages = pipelineRequestedStages(details)
  const rawRequestedStages = isUnknownArray(storedRequestedStages)
    ? storedRequestedStages
    : pipeline?.executionPlan
        .filter((step) => step.enabled && step.service !== DATA_INGESTER_SERVICE)
        .map((step) => step.service)
  const firstRequestedStage = Array.isArray(rawRequestedStages) ? rawRequestedStages[0] : undefined
  const restartStage = restartStageValue(firstRequestedStage) ?? DATA_INGESTER_SERVICE
  if (!restartStage) {
    throw new Error(`Draft batch ${row.id} has no valid restart stage.`)
  }

  const normalizedRequestedStages = requestedStagesValue(rawRequestedStages, restartStage)
  const collection = collectionDetails(details)
  const storedDetails = draftDetails(details)
  const pipelineRecord = details.pipeline && typeof details.pipeline === 'object' && !Array.isArray(details.pipeline)
    ? details.pipeline as Record<string, unknown>
    : undefined
  const executionMode = typeof pipelineRecord?.executionMode === 'string'
    ? pipelineRecord.executionMode
    : undefined

  return {
    id: row.id,
    name: row.name?.trim() || row.id,
    collectionName: textValue(collection.name),
    collectionNotes: textValue(collection.notes),
    restartStage,
    requestedStages: normalizedRequestedStages,
    pipelineConfig: pipeline ?? getReprocessingPipelineConfig(restartStage, normalizedRequestedStages),
    executionMode: executionMode as ReprocessingDraftSummary['executionMode'],
    reason: textValue(storedDetails.reason) ?? '',
    sourceFolderIds: pipeline?.sourceFolderIds ?? [],
    sourceDocumentIds: pipeline?.sourceDocumentIds ?? [],
    documentCount: row.document_to_batches.length,
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
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
    where: { id: batchId, lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT },
    select: draftSelect(),
  })
}

function validateDraftInput(input: {
  name: string
  reason: string
  restartStage?: CallbackStageKey
  requestedStages?: readonly CallbackStageKey[]
}): string | null {
  if (!input.name.trim()) return 'A batch name is required.'
  if (!input.reason.trim()) return 'A reason is required.'
  if (input.restartStage && !REPROCESSABLE_START_STAGES.has(input.restartStage)) {
    return 'Select a valid reprocessing start stage.'
  }
  if (input.restartStage && input.requestedStages) {
    const normalized = normalizeBatchDraftRequestedStages(input.restartStage, input.requestedStages)
    if (normalized.length === 0) return 'Select an ordered set of reprocessing stages beginning with the start stage.'
  }
  return null
}

function buildDraftProcessingDetails(input: {
  restartStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  reason: string
  collectionName: string | null
  collectionNotes: string | null
  executionMode:
    | typeof GENERATED_PIPELINE_EXECUTION_MODES.NORMAL
    | typeof GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS
  pipelineConfig: PipelineConfig
}): string {
  return JSON.stringify({
    reason: input.reason,
    collection: input.collectionName
      ? { name: input.collectionName, notes: input.collectionNotes }
      : input.collectionNotes
        ? { name: null, notes: input.collectionNotes }
        : null,
    pipeline: {
      executionMode: input.executionMode,
      requestedStages: input.requestedStages,
      config: input.pipelineConfig,
    },
  })
}

function draftAuditValue(name: string | null, processingDetails: string | null): Record<string, unknown> {
  const details = parseDetails(processingDetails)
  const collection = collectionDetails(details)
  const pipeline = pipelineConfig(details)
  return {
    name: textValue(name),
    collectionName: textValue(collection.name),
    collectionNotes: textValue(collection.notes),
    requestedStages: pipelineRequestedStages(details),
    pipelineConfig: pipeline,
    reason: textValue(draftDetails(details).reason),
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
      batches: { lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT },
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

async function syncDraftSourceDocumentIds(
  client: DraftQueryClient,
  batchId: string,
  sourceDocumentIds: readonly string[],
  editSummary: string,
): Promise<void> {
  const draft = await client.batches.findFirst({
    where: { id: batchId, lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT },
    select: { processing_details: true },
  })
  if (!draft) return

  const details = parseDetails(draft.processing_details)
  const currentConfig = pipelineConfig(details)
  if (!currentConfig) return

  const normalizedSourceDocumentIds = normalizeDocumentIds(sourceDocumentIds)
  if (JSON.stringify(currentConfig.sourceDocumentIds ?? []) === JSON.stringify(normalizedSourceDocumentIds)) return

  const nextConfig: PipelineConfig = {
    ...currentConfig,
    sourceDocumentIds: normalizedSourceDocumentIds,
  }
  const nextDetails = {
    ...details,
    pipeline: {
      ...(details.pipeline && typeof details.pipeline === 'object' ? details.pipeline : {}),
      config: nextConfig,
    },
  }
  await client.batches.update({
    where: { id: batchId },
    data: { processing_details: JSON.stringify(nextDetails) },
  })
  await createEditHistoryEntry(client, {
    entityTable: 'batches',
    entityId: batchId,
    previousValue: { pipelineConfig: currentConfig },
    newValue: { pipelineConfig: nextConfig },
    editSummary,
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

  await Promise.all(
    [...new Set(memberships.map((membership) => membership.batch_id))].map(async (batchId) => {
      const remaining = await client.document_to_batches.findMany({
        where: { batch_id: batchId },
        select: { document_id: true },
      })
      await syncDraftSourceDocumentIds(
        client,
        batchId,
        remaining.map((membership) => membership.document_id),
        `Updated source documents for draft batch ${batchId}.`,
      )
    }),
  )

  return [...new Set(memberships.map((membership) => membership.document_id))]
}

export async function getReprocessingDrafts(client: DraftQueryClient = db): Promise<ReprocessingDraftSummary[]> {
  const rows = await client.batches.findMany({
    where: { lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT },
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
    where: { id: batchId, lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT },
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
                where: { batches: { lifecycle_status: { not: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT } } },
                orderBy: [{ added_at: 'desc' }, { id: 'desc' }],
                take: 1,
                select: {
                  batches: { select: { id: true, id_legacy: true, name: true } },
                },
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
    sourceBatchId: membership.documents.document_to_batches[0]?.batches.id ?? null,
    sourceBatchLegacyId: membership.documents.document_to_batches[0]?.batches.id_legacy ?? null,
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
    where: { document_id: documentId, batches: { lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT } },
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
      batches: { lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT },
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
  return createBatchDraft({ ...input, documentIds: [input.documentId] })
}

export async function createReprocessingDraftForDocuments(
  input: CreateReprocessingDraftForDocumentsInput,
): Promise<ReprocessingDraftActionResult> {
  return createBatchDraft(input)
}

function normalizeBatchDraftRequestedStages(
  restartStage: CallbackStageKey,
  requestedStages: readonly CallbackStageKey[],
): CallbackStageKey[] {
  if (restartStage === DATA_INGESTER_SERVICE) {
    return [...new Set(requestedStages)]
  }
  return normalizeReprocessingRequestedStages(restartStage, requestedStages)
}

export async function createBatchDraft(input: CreateBatchDraftInput): Promise<ReprocessingDraftActionResult> {
  const documentIds = normalizeDocumentIds(input.documentIds ?? [])
  const sourceFolderIds = normalizeDocumentIds(input.sourceFolderIds ?? [])
  const name = input.name.trim()
  const reason = input.reason.trim()
  const restartStage = input.restartStage
  const requestedStages = normalizeBatchDraftRequestedStages(restartStage, input.requestedStages)
  const executionMode =
    input.executionMode ??
    (restartStage === DATA_INGESTER_SERVICE
      ? GENERATED_PIPELINE_EXECUTION_MODES.NORMAL
      : GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS)
  const basePipelineConfig =
    input.pipelineConfig ??
    (restartStage === DATA_INGESTER_SERVICE
      ? draftToPipelineConfig(createDefaultDraft())
      : getReprocessingPipelineConfig(restartStage, requestedStages))
  const pipelineConfig: PipelineConfig = {
    ...basePipelineConfig,
    sourceFolderIds,
    sourceDocumentIds: documentIds,
  }
  const validationError = documentIds.length > 0 || sourceFolderIds.length > 0
    ? validateDraftInput({ name, reason, restartStage, requestedStages })
    : 'At least one source folder or document is required.'
  if (validationError) return { ok: false, error: validationError }

  try {
    return await db.$transaction(async (tx) => {
      if (documentIds.length > 0) {
        await lockDocuments(tx, documentIds)
        const documentValidationError = await validateDraftDocuments(tx, documentIds)
        if (documentValidationError) return { ok: false, error: documentValidationError }
      }

      const nameHash = buildNameHash(name)
      const existingName = await tx.batches.findFirst({
        where: { OR: [{ name_hash: nameHash }, { name }] },
        select: { id: true },
      })
      if (existingName) return { ok: false, error: `Batch name “${name}” already exists.` }

      if (documentIds.length > 0) await removeOpenDraftMemberships(tx, documentIds)

      const batchId = crypto.randomUUID()
      await tx.batches.create({
        data: {
          id: batchId,
          name,
          started_by: null,
          lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT,
          processing_details: buildDraftProcessingDetails({
            restartStage,
            requestedStages,
            reason,
            collectionName: textValue(input.collectionName),
            collectionNotes: textValue(input.collectionNotes),
            executionMode,
            pipelineConfig,
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
              batch_origin: BATCH_ORIGINS.DRAFT,
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
          lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT,
          restart_stage: restartStage,
          requested_stages: requestedStages,
          document_ids: documentIds,
        },
        editorEmail: input.createdBy ?? undefined,
        editSummary: 'Created batch draft.',
      })
      return { ok: true, batchId }
    })
  } catch (error: unknown) {
    return isUniqueConstraintError(error)
      ? { ok: false, error: `Batch name “${name}” already exists.` }
      : { ok: false, error: error instanceof Error ? error.message : 'The batch draft could not be created.' }
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
              batch_origin: BATCH_ORIGINS.DRAFT,
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
      await syncDraftSourceDocumentIds(
        tx,
        batchId,
        [...existingDocumentIds, ...documentIdsToAdd],
        `Updated source documents for draft batch ${batchId}.`,
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
  const requestedStages = normalizeBatchDraftRequestedStages(input.restartStage, input.requestedStages)
  const validationError = validateDraftInput({
    name,
    reason,
    restartStage: input.restartStage,
    requestedStages,
  })
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
      const currentDetails = parseDetails(draft.processing_details)
      const currentConfig = pipelineConfig(currentDetails)
      const basePipelineConfig =
        input.pipelineConfig ??
        currentConfig ??
        (input.restartStage === DATA_INGESTER_SERVICE
          ? draftToPipelineConfig(createDefaultDraft())
          : getReprocessingPipelineConfig(input.restartStage, requestedStages))
      const effectiveSourceDocumentIds = input.sourceDocumentIds ?? draft.document_to_batches.map((membership) => membership.document_id)
      const effectivePipelineConfig: PipelineConfig = {
        ...basePipelineConfig,
        sourceFolderIds: normalizeDocumentIds(input.sourceFolderIds ?? basePipelineConfig.sourceFolderIds ?? []),
        sourceDocumentIds: normalizeDocumentIds(effectiveSourceDocumentIds),
      }
      const processingDetails = buildDraftProcessingDetails({
        restartStage: input.restartStage,
        requestedStages,
        reason,
        collectionName: textValue(input.collectionName),
        collectionNotes: textValue(input.collectionNotes),
        executionMode:
          input.executionMode ??
          (input.restartStage === DATA_INGESTER_SERVICE
            ? GENERATED_PIPELINE_EXECUTION_MODES.NORMAL
            : GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS),
        pipelineConfig: effectivePipelineConfig,
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
          editSummary: 'Updated batch draft details.',
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
    await syncDraftSourceDocumentIds(
      tx,
      batchId.trim(),
      draft.document_to_batches
        .map((draftMembership) => draftMembership.document_id)
        .filter((draftDocumentId) => draftDocumentId !== documentId.trim()),
      `Updated source documents for draft batch ${batchId.trim()}.`,
    )
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
      data: { lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.ARCHIVE },
    })
    await createEditHistoryEntry(tx, {
      entityTable: 'batches',
      entityId: normalizedBatchId,
      previousValue: { lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT },
      newValue: { lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.ARCHIVE },
      editSummary: 'Archived batch draft.',
    })
    return { ok: true, batchId: normalizedBatchId }
  })
}
