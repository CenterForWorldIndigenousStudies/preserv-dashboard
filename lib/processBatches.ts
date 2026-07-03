import { db } from '@lib/db'
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
  processing_details: string | null
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

function toProcessBatchStatus(batch: SelectedBatchFields): ProcessBatchStatus {
  const details = normalizeProcessBatchDetails(parseProcessingDetails(batch.processing_details))

  return {
    batchId: batch.id,
    batchName: normalizeText(batch.name),
    startedBy: normalizeText(batch.started_by),
    createdAt: toIsoString(batch.created_at),
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
    batch.rightsDeterminator !== null
  )
}

const processBatchSelect = {
  id: true,
  name: true,
  started_by: true,
  created_at: true,
  processing_details: true,
} as const

export async function getProcessBatchStatuses(limit = 25): Promise<ProcessBatchStatus[]> {
  const batches = await db.batches.findMany({
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit,
    select: processBatchSelect,
  })

  return batches.map(toProcessBatchStatus).filter(hasProcessState)
}

export async function getProcessBatchStatus(batchId: string): Promise<ProcessBatchStatus | null> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: processBatchSelect,
  })

  return batch ? toProcessBatchStatus(batch) : null
}

function withRequestedStages(
  details: RawProcessBatchDetails,
  requestedStages: string[],
): RawProcessBatchDetails {
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
    select: { id: true, processing_details: true },
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

  await db.batches.update({
    where: { id: batchId },
    data: {
      processing_details: JSON.stringify(nextDetails),
    },
  })
}

export async function markProcessStageCallbackReceived(
  batchId: string,
  stageKey: CallbackStageKey,
  receivedAt: number | string,
): Promise<void> {
  await updateProcessStageCallbackReceived(batchId, stageKey, receivedAt)
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
  underReviewCount: number
  failedCount: number
}

interface RightsDeterminatorCompletionArgs {
  requestId: string
  initiatedAt: string
  completedAt: string
  processedCount: number
  rightsDeterminedCount: number
  underReviewCount: number
  failedCount: number
}

export async function recordMetadataExtractorCompletion(
  batchId: string,
  {
    requestId,
    initiatedAt,
    completedAt,
    processedCount,
    extractedCount,
    failedCount,
  }: MetadataExtractorCompletionArgs,
): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: { id: true, processing_details: true },
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
      processing_details: JSON.stringify(nextDetails),
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
    underReviewCount,
    failedCount,
  }: MetadataValidatorCompletionArgs,
): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: { id: true, processing_details: true },
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
      under_review_count: underReviewCount,
      failed_count: failedCount,
      current_pass: 1,
      max_passes: 1,
      completed_passes: [1],
    },
  }

  await db.batches.update({
    where: { id: batchId },
    data: {
      processing_details: JSON.stringify(nextDetails),
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
    underReviewCount,
    failedCount,
  }: RightsDeterminatorCompletionArgs,
): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: { id: true, processing_details: true },
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
      under_review_count: underReviewCount,
      failed_count: failedCount,
      current_pass: 1,
      max_passes: 1,
      completed_passes: [1],
    },
  }

  await db.batches.update({
    where: { id: batchId },
    data: {
      processing_details: JSON.stringify(nextDetails),
    },
  })
}
