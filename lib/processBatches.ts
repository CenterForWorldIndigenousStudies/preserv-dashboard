import { db } from '@lib/db'
import { isPipelineBatchTerminal } from '@lib/pipelineExecution'
import { normalizeProcessBatchDetails, parseProcessingDetails, resolveStageDetailKey } from '@lib/pipelineNormalization'
import { parsePipelineConfig, pipelineConfigToRequestedStages, type PipelineConfig } from '@lib/pipelineConfig'
import type {
  CallbackStageKey,
  ProcessBatchStatus,
  RawProcessBatchDetails,
  RawProcessStageDetails,
} from 'types/pipelineContracts'

export type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

type SelectedBatchFields = {
  id: string
  name: string | null
  started_by: string | null
  created_at: Date | null
  started_at: Date | null
  processing_details: string | null
  lifecycle_status: string
  publication_status: string
  publication_target: string
  batch_rollbacks: {
    status: string
    restored_count: number
    deleted_count: number
    cancelled_count: number
    conflict_count: number
    failed_count: number
    last_failure: string | null
  } | null
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return value ?? null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function toIsoString(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

async function hasManualEditAfterStart(startedAt: Date | null): Promise<boolean> {
  if (!startedAt) {
    return false
  }

  const edit = await db.edit_history.findFirst({
    where: {
      editor_email: { not: null },
      edited_at: { gt: startedAt },
    },
    select: { id: true },
  })

  return edit !== null
}

async function toProcessBatchStatus(batch: SelectedBatchFields): Promise<ProcessBatchStatus> {
  const manualEditAfterStart = await hasManualEditAfterStart(batch.started_at)
  return buildProcessBatchStatus(batch, manualEditAfterStart)
}

function buildProcessBatchStatus(
  batch: SelectedBatchFields,
  manualEditAfterStart: boolean,
): ProcessBatchStatus {
  const details = normalizeProcessBatchDetails(parseProcessingDetails(batch.processing_details))
  const rollback = batch.batch_rollbacks

  return {
    batchId: batch.id,
    batchName: normalizeText(batch.name),
    startedBy: normalizeText(batch.started_by),
    createdAt: toIsoString(batch.created_at),
    lifecycleStatus: batch.lifecycle_status,
    publicationStatus: batch.publication_status,
    publicationTarget: batch.publication_target,
    manualEditAfterStart,
    rollbackStatus: rollback?.status ?? null,
    rollbackFailure: rollback?.last_failure ?? null,
    rollbackCounts: rollback
      ? {
          restored: rollback.restored_count,
          deleted: rollback.deleted_count,
          cancelled: rollback.cancelled_count,
          conflicts: rollback.conflict_count,
          failed: rollback.failed_count,
        }
      : null,
    ...details,
  }
}

function hasProcessState(batch: ProcessBatchStatus): boolean {
  return (
    batch.pipelineRequestedStages.length > 0 ||
    batch.ingester !== null ||
    batch.documentSplitter !== null ||
    batch.pageRotator !== null ||
    batch.ocrProcessor !== null ||
    batch.contentDedup !== null ||
    batch.metadataExtractor !== null ||
    batch.metadataValidator !== null ||
    batch.rightsDeterminator !== null ||
    (batch.fedoraIngester !== null && batch.fedoraIngester !== undefined)
  )
}

const processBatchSelect = {
  id: true,
  name: true,
  started_by: true,
  created_at: true,
  started_at: true,
  processing_details: true,
  lifecycle_status: true,
  publication_status: true,
  publication_target: true,
  batch_rollbacks: {
    select: {
      status: true,
      restored_count: true,
      deleted_count: true,
      cancelled_count: true,
      conflict_count: true,
      failed_count: true,
      last_failure: true,
    },
  },
} as const

export async function getProcessBatchStatuses(limit = 25): Promise<ProcessBatchStatus[]> {
  const batches = await db.batches.findMany({
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit,
    select: processBatchSelect,
  })

  const statuses = await Promise.all(batches.map(toProcessBatchStatus))
  return statuses.filter(hasProcessState)
}

export async function getProcessBatchStatus(batchId: string): Promise<ProcessBatchStatus | null> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: processBatchSelect,
  })

  return batch ? await toProcessBatchStatus(batch) : null
}

function parseCompletionDate(value: string | number | null | undefined): Date | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000)
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  if (/^\d+$/.test(normalized)) {
    return new Date(Number(normalized) * 1000)
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const stageCompletedAtGetters = {
  ingester: (batch: ProcessBatchStatus) => batch.ingester?.completedAt ?? null,
  document_splitter: (batch: ProcessBatchStatus) => batch.documentSplitter?.completedAt ?? null,
  page_rotator: (batch: ProcessBatchStatus) => batch.pageRotator?.completedAt ?? null,
  ocr_processor: (batch: ProcessBatchStatus) => batch.ocrProcessor?.completedAt ?? null,
  content_dedup: (batch: ProcessBatchStatus) => batch.contentDedup?.completedAt ?? null,
  metadata_extractor: (batch: ProcessBatchStatus) => batch.metadataExtractor?.completedAt ?? null,
  metadata_validator: (batch: ProcessBatchStatus) => batch.metadataValidator?.completedAt ?? null,
  rights_determinator: (batch: ProcessBatchStatus) => batch.rightsDeterminator?.completedAt ?? null,
  fedora_ingester: (batch: ProcessBatchStatus) => batch.fedoraIngester?.completedAt ?? null,
} satisfies Record<CallbackStageKey, (batch: ProcessBatchStatus) => string | null>

function getStageCompletedAt(batch: ProcessBatchStatus, stageKey: CallbackStageKey): string | null {
  return stageCompletedAtGetters[stageKey](batch)
}

function withRequestedStages(details: RawProcessBatchDetails, requestedStages: string[]): RawProcessBatchDetails {
  return {
    ...details,
    pipeline: {
      ...(details.pipeline ?? {}),
      requested_stages: requestedStages,
    },
  }
}

export async function setProcessBatchPipelineConfig(batchId: string, pipelineConfig: PipelineConfig): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: { id: true, processing_details: true },
  })

  if (!batch) {
    throw new Error(`Batch ${batchId} was not found`)
  }

  const details = parseProcessingDetails(batch.processing_details)
  const requestedStages = pipelineConfigToRequestedStages(pipelineConfig)

  await db.batches.update({
    where: { id: batchId },
    data: {
      processing_details: JSON.stringify({
        ...withRequestedStages(details, requestedStages),
        pipeline: {
          ...(details.pipeline ?? {}),
          requested_stages: requestedStages,
          config: pipelineConfig,
        },
      }),
    },
  })
}

export async function getProcessBatchPipelineConfig(batchId: string): Promise<PipelineConfig | null> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: { id: true, processing_details: true },
  })

  if (!batch) {
    return null
  }

  const details = parseProcessingDetails(batch.processing_details)
  return parsePipelineConfig(details.pipeline?.config)
}

async function updateProcessStageCallbackReceived(
  batchId: string,
  stageKey: CallbackStageKey,
  receivedAt: number | string,
): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: processBatchSelect,
  })

  if (!batch) {
    throw new Error(`Batch ${batchId} was not found`)
  }

  const details = parseProcessingDetails(batch.processing_details)
  const stageDetailKey = resolveStageDetailKey(details, stageKey)
  const stageDetails = stageDetailKey ? details[stageDetailKey as keyof RawProcessBatchDetails] : null
  if (!stageDetailKey || !stageDetails || typeof stageDetails !== 'object') {
    throw new Error(`Batch ${batchId} does not contain ${stageKey} processing details`)
  }

  const currentStageDetails = stageDetails as RawProcessStageDetails
  const nextDetails: RawProcessBatchDetails = {
    ...details,
    [stageDetailKey]: {
      ...currentStageDetails,
      callback: {
        ...(currentStageDetails.callback ?? {}),
        received_at: receivedAt,
      },
    },
  }

  const serializedDetails = JSON.stringify(nextDetails)
  const nextBatch = buildProcessBatchStatus(
    {
      ...batch,
      processing_details: serializedDetails,
    },
    false,
  )
  const terminalCompletedAt =
    parseCompletionDate(getStageCompletedAt(nextBatch, stageKey)) ?? parseCompletionDate(receivedAt)
  const updateData: {
    processing_details: string
    lifecycle_status?: string
    completed_at?: Date
  } = {
    processing_details: serializedDetails,
  }

  if (batch.lifecycle_status !== 'completed' && isPipelineBatchTerminal(nextBatch)) {
    updateData.lifecycle_status = 'completed'
    if (terminalCompletedAt) {
      updateData.completed_at = terminalCompletedAt
    }
  }

  await db.batches.update({
    where: { id: batchId },
    data: updateData,
  })
}

export async function markProcessStageCallbackReceived(
  batchId: string,
  stageKey: CallbackStageKey,
  receivedAt: number | string,
): Promise<void> {
  await updateProcessStageCallbackReceived(batchId, stageKey, receivedAt)
}

export interface ProcessStageFailureArgs {
  requestId: string
  operationId: string
  executionMode: string
  errorType: string
  errorMessage: string
  receivedAt: number | string
}

export async function recordProcessStageFailure(
  batchId: string,
  stageKey: CallbackStageKey,
  {
    requestId,
    operationId,
    executionMode,
    errorType,
    errorMessage,
    receivedAt,
  }: ProcessStageFailureArgs,
): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: processBatchSelect,
  })

  if (!batch) {
    throw new Error(`Batch ${batchId} was not found`)
  }

  const details = parseProcessingDetails(batch.processing_details)
  const stageDetailKey = resolveStageDetailKey(details, stageKey)
  if (!stageDetailKey) {
    throw new Error(`Batch ${batchId} does not contain ${stageKey} processing details`)
  }

  const currentStage = details[stageDetailKey as keyof RawProcessBatchDetails]
  const currentStageDetails =
    currentStage && typeof currentStage === 'object' ? (currentStage as RawProcessStageDetails) : {}
  const completedAt = new Date().toISOString()
  const nextDetails: RawProcessBatchDetails = {
    ...details,
    [stageDetailKey]: {
      ...currentStageDetails,
      status: 'failed',
      request_id: requestId,
      operation_id: operationId,
      execution_mode: executionMode,
      error: errorMessage,
      last_transition_at: completedAt,
      callback: {
        ...(currentStageDetails.callback ?? {}),
        received_at: receivedAt,
        error_type: errorType,
        error_message: errorMessage,
      },
    },
  }

  await db.batches.update({
    where: { id: batchId },
    data: { processing_details: JSON.stringify(nextDetails) },
  })
}

interface MetadataExtractorCompletionArgs {
  requestId: string
  initiatedAt: string
  completedAt: string
  processedCount: number
  extractedCount: number
  failedCount: number
}

interface MetadataValidatorCompletionArgs {
  requestId: string
  initiatedAt: string
  completedAt: string
  processedCount: number
  metadataValidatedCount: number
  needsReviewCount: number
  failedCount: number
}

interface RightsDeterminatorCompletionArgs {
  requestId: string
  initiatedAt: string
  completedAt: string
  processedCount: number
  rightsDeterminedCount: number
  needsReviewCount: number
  failedCount: number
}

function buildCompletionUpdateData(
  batch: SelectedBatchFields,
  nextDetails: RawProcessBatchDetails,
  completedAt: string,
): {
  processing_details: string
  lifecycle_status?: string
  completed_at?: Date
} {
  const serializedDetails = JSON.stringify(nextDetails)
  const nextBatch = buildProcessBatchStatus(
    {
      ...batch,
      processing_details: serializedDetails,
    },
    false,
  )
  const updateData: {
    processing_details: string
    lifecycle_status?: string
    completed_at?: Date
  } = {
    processing_details: serializedDetails,
  }

  if (batch.lifecycle_status !== 'completed' && isPipelineBatchTerminal(nextBatch)) {
    updateData.lifecycle_status = 'completed'
    updateData.completed_at = new Date(completedAt)
  }

  return updateData
}

export async function recordMetadataExtractorCompletion(
  batchId: string,
  { requestId, initiatedAt, completedAt, processedCount, extractedCount, failedCount }: MetadataExtractorCompletionArgs,
): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: processBatchSelect,
  })

  if (!batch) {
    throw new Error(`Batch ${batchId} was not found`)
  }

  const details = parseProcessingDetails(batch.processing_details)
  const currentStage = details.metadata_extractor
  const currentStageDetails = currentStage && typeof currentStage === 'object' ? currentStage : {}

  const nextDetails: RawProcessBatchDetails = {
    ...details,
    metadata_extractor: {
      ...currentStageDetails,
      status: 'completed',
      request_id: requestId,
      requested_by_app: 'preserv-dashboard',
      initiated_at: initiatedAt,
      started_at: initiatedAt,
      completed_at: completedAt,
      last_transition_at: completedAt,
      processed_count: processedCount,
      extracted_count: extractedCount,
      failed_count: failedCount,
      current_pass: 1,
      max_passes: 1,
      completed_passes: [1],
    },
  }

  await db.batches.update({
    where: { id: batchId },
    data: {
      ...buildCompletionUpdateData(batch, nextDetails, completedAt),
    },
  })
}

export async function recordMetadataValidatorCompletion(
  batchId: string,
  {
    requestId,
    initiatedAt,
    completedAt,
    processedCount,
    metadataValidatedCount,
    needsReviewCount,
    failedCount,
  }: MetadataValidatorCompletionArgs,
): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: processBatchSelect,
  })

  if (!batch) {
    throw new Error(`Batch ${batchId} was not found`)
  }

  const details = parseProcessingDetails(batch.processing_details)
  const currentStage = details.metadata_validator
  const currentStageDetails = currentStage && typeof currentStage === 'object' ? currentStage : {}

  const nextDetails: RawProcessBatchDetails = {
    ...details,
    metadata_validator: {
      ...currentStageDetails,
      status: 'completed',
      request_id: requestId,
      requested_by_app: 'preserv-dashboard',
      initiated_at: initiatedAt,
      started_at: initiatedAt,
      completed_at: completedAt,
      last_transition_at: completedAt,
      processed_count: processedCount,
      metadata_validated_count: metadataValidatedCount,
      needs_review_count: needsReviewCount,
      failed_count: failedCount,
      current_pass: 1,
      max_passes: 1,
      completed_passes: [1],
    },
  }

  await db.batches.update({
    where: { id: batchId },
    data: {
      ...buildCompletionUpdateData(batch, nextDetails, completedAt),
    },
  })
}

export async function recordRightsDeterminatorCompletion(
  batchId: string,
  {
    requestId,
    initiatedAt,
    completedAt,
    processedCount,
    rightsDeterminedCount,
    needsReviewCount,
    failedCount,
  }: RightsDeterminatorCompletionArgs,
): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: processBatchSelect,
  })

  if (!batch) {
    throw new Error(`Batch ${batchId} was not found`)
  }

  const details = parseProcessingDetails(batch.processing_details)
  const currentStage = details.rights_determinator
  const currentStageDetails = currentStage && typeof currentStage === 'object' ? currentStage : {}

  const nextDetails: RawProcessBatchDetails = {
    ...details,
    rights_determinator: {
      ...currentStageDetails,
      status: 'completed',
      request_id: requestId,
      requested_by_app: 'preserv-dashboard',
      initiated_at: initiatedAt,
      started_at: initiatedAt,
      completed_at: completedAt,
      last_transition_at: completedAt,
      processed_count: processedCount,
      rights_determined_count: rightsDeterminedCount,
      needs_review_count: needsReviewCount,
      failed_count: failedCount,
      current_pass: 1,
      max_passes: 1,
      completed_passes: [1],
    },
  }

  await db.batches.update({
    where: { id: batchId },
    data: {
      ...buildCompletionUpdateData(batch, nextDetails, completedAt),
    },
  })
}
