'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'

import { BATCHES_PATH, DOCUMENTS_PATH, READY_FOR_LIBRARY_PATH } from '@constants/paths'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'
import {
  CONTENT_DEDUP_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  FEDORA_INGESTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  PAGE_ROTATOR_SERVICE,
} from '@constants/pipeline'
import { getDashboardSession } from '@root/auth'
import { PIPELINE_STAGE_PROPERTIES } from '@constants/pipelineStageProperties'
import type { PipelineExecutionContextInput } from '@lib/pipelineExecutionContext'
import { batchNameExists, documentIdsExist, getPipelineExecutionSnapshot } from '@lib/queries/pipelineExecutionQueries'
import { getBatchDraft } from '@lib/queries/batchDraftQueries'
import { normalizeReprocessingRequestedStages } from '@lib/reprocessingDrafts'
import {
  triggerContentDedup,
  triggerDataIngesterBatch,
  triggerDocumentSplitter,
  triggerFedoraIngester,
  triggerDataIngesterReprocess,
  triggerMetadataExtractor,
  triggerOcrProcessor,
  triggerPageRotator,
} from '@lib/pipelineTriggerRequests'
import type { PipelineExecutionActionResult, PipelineExecutionRequest } from 'types/pipelineExecution'
import type { CallbackStageKey, ProcessBatchStatus } from 'types/pipelineContracts'

const REPROCESSABLE_STAGES = new Set<CallbackStageKey>([
  DOCUMENT_SPLITTER_SERVICE,
  PAGE_ROTATOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  CONTENT_DEDUP_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
])

const ACTIVE_BATCH_LIFECYCLE_STATUSES = new Set<string>([
  GENERATED_BATCH_LIFECYCLE_STATUSES.QUEUED,
  GENERATED_BATCH_LIFECYCLE_STATUSES.RUNNING,
])

const triggerByStage: Partial<
  Record<CallbackStageKey, (batch: ProcessBatchStatus, context?: PipelineExecutionContextInput) => Promise<unknown>>
> = {
  [DOCUMENT_SPLITTER_SERVICE]: triggerDocumentSplitter,
  [PAGE_ROTATOR_SERVICE]: triggerPageRotator,
  [OCR_PROCESSOR_SERVICE]: triggerOcrProcessor,
  [CONTENT_DEDUP_SERVICE]: triggerContentDedup,
  [METADATA_EXTRACTOR_SERVICE]: triggerMetadataExtractor,
  [FEDORA_INGESTER_SERVICE]: triggerFedoraIngester,
}

function normalizeRequest(request: PipelineExecutionRequest): PipelineExecutionRequest {
  const documentIds = [...new Set((request.documentIds ?? []).map((id) => id.trim()).filter(Boolean))]
  const requestedStages: CallbackStageKey[] | undefined = request.requestedStages
    ? [...new Set(request.requestedStages.map((stage) => stage.trim() as CallbackStageKey).filter(Boolean))]
    : undefined
  return {
    ...request,
    batchId: request.batchId?.trim() || undefined,
    draftBatchId: request.draftBatchId?.trim() || undefined,
    documentIds,
    requestedStages,
    newBatchName: request.newBatchName?.trim() || undefined,
    reason: request.reason.trim(),
  }
}

function validateRequest(request: PipelineExecutionRequest): string | null {
  if (!request.reason) {
    return 'A reason is required.'
  }
  if (!request.restartStage) {
    return 'A restart stage is required.'
  }
  if (request.mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS) {
    if (!REPROCESSABLE_STAGES.has(request.restartStage)) {
      return 'Fedora Ingester cannot be used as a reprocessing start stage.'
    }
    const requestedStages = request.requestedStages ?? [request.restartStage]
    if (normalizeReprocessingRequestedStages(request.restartStage, requestedStages).length === 0) {
      return 'Requested reprocessing stages must begin with the restart stage.'
    }
    if (request.draftBatchId) {
      if (request.newBatchName || request.documentIds?.length) {
        return 'A draft submission cannot specify a new batch name or document list.'
      }
    } else {
      if (!request.documentIds?.length) {
        return 'Select at least one document to reprocess.'
      }
      if (!request.newBatchName) {
        return 'A new batch name is required when reprocessing documents.'
      }
    }
    return null
  }
  if (request.draftBatchId) {
    return request.batchId === request.draftBatchId ? null : 'A draft batch is required.'
  }
  return request.batchId ? null : 'A batch is required.'
}

type ExecutionPreflight =
  | { ok: true; sourceBatch: Awaited<ReturnType<typeof getPipelineExecutionSnapshot>> | null }
  | { ok: false; error: string }

async function preflightReprocess(request: PipelineExecutionRequest): Promise<string | null> {
  if (request.draftBatchId) {
    const draft = await getBatchDraft(request.draftBatchId)
    if (draft) {
      if (draft.restartStage !== request.restartStage)
        return 'The selected stage does not match the draft restart stage.'
      if (JSON.stringify(draft.requestedStages) !== JSON.stringify(request.requestedStages ?? draft.requestedStages)) {
        return 'The selected stages do not match the draft processing plan.'
      }
      if (draft.documentCount === 0) return 'A reprocessing draft must contain at least one document.'
      return null
    }

    const submittedSnapshot = await getPipelineExecutionSnapshot(request.draftBatchId)
    const currentExecution = submittedSnapshot.currentExecution
    const replayKey = `draft-submit:${request.draftBatchId}`
    if (
      submittedSnapshot.batch &&
      ACTIVE_BATCH_LIFECYCLE_STATUSES.has(submittedSnapshot.batch.lifecycleStatus ?? '') &&
      currentExecution?.idempotencyKey === replayKey &&
      currentExecution.stage === request.restartStage
    ) {
      return null
    }

    return 'The reprocessing draft was not found or is no longer editable.'
  }

  if (!(await documentIdsExist(request.documentIds ?? []))) {
    return 'One or more selected documents could not be found.'
  }
  if (request.newBatchName && (await batchNameExists(request.newBatchName))) {
    return `Batch name “${request.newBatchName}” already exists.`
  }
  return null
}

async function preflightDraft(request: PipelineExecutionRequest): Promise<string | null> {
  if (!request.draftBatchId) return null
  const draft = await getBatchDraft(request.draftBatchId)
  if (!draft) return 'The batch draft was not found or is no longer editable.'
  if (draft.restartStage !== request.restartStage) {
    return 'The selected stage does not match the draft start stage.'
  }
  const requestedStages = request.requestedStages ?? draft.requestedStages
  if (JSON.stringify(draft.requestedStages) !== JSON.stringify(requestedStages)) {
    return 'The selected stages do not match the draft processing plan.'
  }
  const folderCount = draft.sourceFolderIds?.length ?? draft.pipelineConfig?.sourceFolderIds?.length ?? 0
  const documentCount = draft.sourceDocumentIds?.length ?? draft.documents.length
  if (folderCount === 0 && documentCount === 0) {
    return 'A batch draft must contain at least one source folder or document.'
  }
  return null
}

async function preflightExecution(request: PipelineExecutionRequest): Promise<ExecutionPreflight> {
  if (request.mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS) {
    const reprocessError = await preflightReprocess(request)
    if (reprocessError) {
      return { ok: false, error: reprocessError }
    }
  }
  if (request.mode === GENERATED_PIPELINE_EXECUTION_MODES.NORMAL && request.draftBatchId) {
    const draftError = await preflightDraft(request)
    if (draftError) return { ok: false, error: draftError }
  }

  const sourceBatchId = request.draftBatchId ?? request.batchId
  const sourceBatch = sourceBatchId ? await getPipelineExecutionSnapshot(sourceBatchId) : null
  if (request.mode !== GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS && !sourceBatch?.batch) {
    return { ok: false, error: `Batch ${request.batchId} was not found.` }
  }
  if (
    request.mode === GENERATED_PIPELINE_EXECUTION_MODES.RETRY &&
    sourceBatch?.batch &&
    getStageStatus(sourceBatch.batch, request.restartStage) !== 'failed'
  ) {
    return { ok: false, error: 'Retry is only available for a failed stage.' }
  }
  if (
    request.mode === GENERATED_PIPELINE_EXECUTION_MODES.RERUN &&
    sourceBatch?.batch &&
    isPublishedBatch(sourceBatch.batch)
  ) {
    return { ok: false, error: 'Published batches must be reprocessed into a new batch.' }
  }

  return { ok: true, sourceBatch }
}

function isPublishedBatch(batch: ProcessBatchStatus): boolean {
  return batch.lifecycleStatus === GENERATED_BATCH_LIFECYCLE_STATUSES.PUBLISHED
}

function sourceBatchIdForRequest(request: PipelineExecutionRequest): string | undefined {
  return request.draftBatchId ? undefined : (request.sourceBatchId ?? request.batchId)
}

function executionIdentity(request: PipelineExecutionRequest): { operationId: string; idempotencyKey: string } {
  if (request.draftBatchId) {
    const operationId = `draft-submit:${request.draftBatchId}`
    return { operationId, idempotencyKey: operationId }
  }

  return { operationId: randomUUID(), idempotencyKey: randomUUID() }
}

async function triggerRequestedExecution(
  request: PipelineExecutionRequest,
  sourceBatch: Awaited<ReturnType<typeof getPipelineExecutionSnapshot>>['batch'],
  startedBy: string,
  operationId: string,
  idempotencyKey: string,
): Promise<unknown> {
  const draft = request.draftBatchId ? await getBatchDraft(request.draftBatchId) : null
  const trigger = request.mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS && request.draftBatchId
    ? triggerDataIngesterReprocess
    : request.mode === GENERATED_PIPELINE_EXECUTION_MODES.NORMAL && request.draftBatchId
      ? triggerDataIngesterBatch
      : triggerByStage[request.restartStage]
  if (!trigger) {
    throw new Error(`Stage ${request.restartStage} cannot be triggered.`)
  }

  const triggerBatch = request.draftBatchId
    ? buildReprocessTriggerBatch(request, startedBy, draft?.name)
    : sourceBatch ?? buildReprocessTriggerBatch(request, startedBy, draft?.name)
  const sourceDocumentIds = draft?.sourceDocumentIds
    ? [...draft.sourceDocumentIds]
    : draft?.documents.map((document) => document.id)
    ?? sourceBatch?.currentExecution?.sourceDocumentIds
    ?? request.documentIds
  return trigger(triggerBatch, {
    executionMode: request.mode,
    operationId,
    idempotencyKey,
    reason: request.reason,
    sourceDocumentIds,
    sourceBatchId: sourceBatchIdForRequest(request),
    newBatchName: request.newBatchName,
    draftBatchId: request.draftBatchId,
    collection: request.collection,
    pipelineConfig: request.pipelineConfig,
    requestedStages: request.requestedStages ? [...request.requestedStages] : undefined,
  })
}

export async function requestPipelineExecution(
  input: PipelineExecutionRequest,
): Promise<PipelineExecutionActionResult> {
  const session = await getDashboardSession()
  const startedBy = session?.user?.email?.trim()
  if (!startedBy) {
    return { ok: false, error: 'Authentication required.' }
  }

  const request = normalizeRequest(input)
  const validationError = validateRequest(request)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  try {
    const preflight = await preflightExecution(request)
    if (!preflight.ok) {
      return preflight
    }
    const { sourceBatch } = preflight

    const { operationId, idempotencyKey } = executionIdentity(request)
    const accepted = await triggerRequestedExecution(
      request,
      sourceBatch?.batch ?? null,
      startedBy,
      operationId,
      idempotencyKey,
    )
    const acceptedBatchId =
      accepted && typeof accepted === 'object' && 'batchId' in accepted && typeof accepted.batchId === 'string'
        ? accepted.batchId
        : (request.batchId ?? '')

    revalidatePath(BATCHES_PATH)
    revalidatePath(DOCUMENTS_PATH)
    revalidatePath(READY_FOR_LIBRARY_PATH)
    return {
      ok: true,
      batchId: acceptedBatchId,
      operationId,
      message:
        request.mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS
          ? 'Document reprocessing was queued.'
          : 'Pipeline execution was queued.',
    }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'Pipeline execution could not be queued.' }
  }
}

function getStageStatus(batch: ProcessBatchStatus, stage: CallbackStageKey): string | null {
  const stageValue = batch[PIPELINE_STAGE_PROPERTIES[stage]]
  return stageValue && typeof stageValue === 'object' && 'status' in stageValue && typeof stageValue.status === 'string'
    ? stageValue.status
    : null
}

function buildReprocessTriggerBatch(
  request: PipelineExecutionRequest,
  startedBy: string,
  draftName?: string,
): ProcessBatchStatus {
  return {
    batchId: request.draftBatchId ?? '',
    batchName: draftName ?? request.newBatchName ?? null,
    startedBy,
    createdAt: null,
    pipelineRequestedStages: request.requestedStages ? [...request.requestedStages] : [request.restartStage],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    fedoraIngester: null,
  }
}
