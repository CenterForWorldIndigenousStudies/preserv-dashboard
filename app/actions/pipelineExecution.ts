'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'

import { BATCHES_PATH, DOCUMENTS_PATH, READY_FOR_LIBRARY_PATH } from '@constants/paths'
import { getDashboardSession } from '@root/auth'
import type { PipelineExecutionContextInput } from '@lib/pipelineExecutionContext'
import {
  batchNameExists,
  documentIdsExist,
  getPipelineExecutionSnapshot,
} from '@lib/queries/pipelineExecutionQueries'
import {
  triggerContentDedup,
  triggerDocumentSplitter,
  triggerFedoraIngester,
  triggerMetadataExtractor,
  triggerMetadataValidator,
  triggerOcrProcessor,
  triggerPageRotator,
  triggerRightsDeterminator,
} from '@lib/pipelineTriggerRequests'
import type { PipelineExecutionActionResult, PipelineExecutionRequest } from 'types/pipelineExecution'
import type { CallbackStageKey, ProcessBatchStatus } from 'types/pipelineContracts'

const REPROCESSABLE_STAGES = new Set<CallbackStageKey>([
  'document_splitter',
  'page_rotator',
  'ocr_processor',
  'content_dedup',
  'metadata_extractor',
  'metadata_validator',
  'rights_determinator',
])

const triggerByStage: Partial<Record<CallbackStageKey, (batch: ProcessBatchStatus, context?: PipelineExecutionContextInput) => Promise<unknown>>> = {
  document_splitter: triggerDocumentSplitter,
  page_rotator: triggerPageRotator,
  ocr_processor: triggerOcrProcessor,
  content_dedup: triggerContentDedup,
  metadata_extractor: triggerMetadataExtractor,
  metadata_validator: triggerMetadataValidator,
  rights_determinator: triggerRightsDeterminator,
  fedora_ingester: triggerFedoraIngester,
}

function normalizeRequest(request: PipelineExecutionRequest): PipelineExecutionRequest {
  const documentIds = [...new Set((request.documentIds ?? []).map((id) => id.trim()).filter(Boolean))]
  return {
    ...request,
    batchId: request.batchId?.trim() || undefined,
    documentIds,
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
  if (request.mode === 'reprocess') {
    if (!REPROCESSABLE_STAGES.has(request.restartStage)) {
      return 'Fedora Ingester cannot be used as a reprocessing start stage.'
    }
    if (!request.documentIds?.length) {
      return 'Select at least one document to reprocess.'
    }
    if (!request.newBatchName) {
      return 'A new batch name is required when reprocessing documents.'
    }
    return null
  }
  return request.batchId ? null : 'A batch is required.'
}

type ExecutionPreflight =
  | { ok: true; sourceBatch: Awaited<ReturnType<typeof getPipelineExecutionSnapshot>> | null }
  | { ok: false; error: string }

async function preflightExecution(request: PipelineExecutionRequest): Promise<ExecutionPreflight> {
  if (request.mode === 'reprocess') {
    if (!(await documentIdsExist(request.documentIds ?? []))) {
      return { ok: false, error: 'One or more selected documents could not be found.' }
    }
    if (request.newBatchName && (await batchNameExists(request.newBatchName))) {
      return { ok: false, error: `Batch name “${request.newBatchName}” already exists.` }
    }
  }

  const sourceBatch = request.batchId ? await getPipelineExecutionSnapshot(request.batchId) : null
  if (request.mode !== 'reprocess' && !sourceBatch?.batch) {
    return { ok: false, error: `Batch ${request.batchId} was not found.` }
  }
  if (request.mode === 'retry' && sourceBatch?.batch && getStageStatus(sourceBatch.batch, request.restartStage) !== 'failed') {
    return { ok: false, error: 'Retry is only available for a failed stage.' }
  }
  if (request.mode === 'rerun' && sourceBatch?.batch && isPublishedBatch(sourceBatch.batch)) {
    return { ok: false, error: 'Published batches must be reprocessed into a new batch.' }
  }

  return { ok: true, sourceBatch }
}

function isPublishedBatch(batch: ProcessBatchStatus): boolean {
  return ['published', 'publication_locked', 'unknown'].includes(batch.publicationStatus ?? '')
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

    const operationId = randomUUID()
    const trigger = triggerByStage[request.restartStage]
    if (!trigger) {
      return { ok: false, error: `Stage ${request.restartStage} cannot be triggered.` }
    }

    const triggerBatch = sourceBatch?.batch ?? buildReprocessTriggerBatch(request, startedBy)
    const accepted = await trigger(triggerBatch, {
      executionMode: request.mode,
      operationId,
      idempotencyKey: randomUUID(),
      reason: request.reason,
      sourceDocumentIds: request.documentIds,
      sourceBatchId: request.sourceBatchId ?? request.batchId,
      newBatchName: request.newBatchName,
      pipelineConfig: request.mode === 'rerun' ? request.pipelineConfig : undefined,
    })
    const acceptedBatchId = accepted && typeof accepted === 'object' && 'batchId' in accepted && typeof accepted.batchId === 'string'
      ? accepted.batchId
      : request.batchId ?? ''

    revalidatePath(BATCHES_PATH)
    revalidatePath(DOCUMENTS_PATH)
    revalidatePath(READY_FOR_LIBRARY_PATH)
    return {
      ok: true,
      batchId: acceptedBatchId,
      operationId,
      message: request.mode === 'reprocess' ? 'Document reprocessing was queued.' : 'Pipeline execution was queued.',
    }
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'Pipeline execution could not be queued.' }
  }
}

function stageProperty(stage: CallbackStageKey): keyof ProcessBatchStatus {
  const properties: Record<CallbackStageKey, keyof ProcessBatchStatus> = {
    ingester: 'ingester',
    document_splitter: 'documentSplitter',
    page_rotator: 'pageRotator',
    ocr_processor: 'ocrProcessor',
    content_dedup: 'contentDedup',
    metadata_extractor: 'metadataExtractor',
    metadata_validator: 'metadataValidator',
    rights_determinator: 'rightsDeterminator',
    fedora_ingester: 'fedoraIngester',
  }
  return properties[stage]
}

function getStageStatus(batch: ProcessBatchStatus, stage: CallbackStageKey): string | null {
  const stageValue = batch[stageProperty(stage)]
  return stageValue && typeof stageValue === 'object' && 'status' in stageValue && typeof stageValue.status === 'string'
    ? stageValue.status
    : null
}

function buildReprocessTriggerBatch(request: PipelineExecutionRequest, startedBy: string): ProcessBatchStatus {
  return {
    batchId: request.sourceBatchId ?? '',
    batchName: request.newBatchName ?? null,
    startedBy,
    createdAt: null,
    pipelineRequestedStages: [],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    metadataValidator: null,
    rightsDeterminator: null,
    fedoraIngester: null,
  }
}
