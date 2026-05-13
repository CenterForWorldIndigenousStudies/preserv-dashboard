import { db } from '@lib/db'

export interface ProcessStageStatus {
  status: string | null
  requestId: string | null
  requestedByApp: string | null
  initiatedAt: string | null
  startedAt: string | null
  completedAt: string | null
  lastTransitionAt: string | null
  error: string | null
  callbackDeliveryStatus: string | null
  callbackNotifiedAt: string | null
  callbackReceivedAt: string | null
  callbackHttpStatus: number | null
  callbackErrorType: string | null
  callbackErrorMessage: string | null
  processedCount: number
  ingestedCount: number
  duplicateCount: number
  skippedSameOriginCount: number
  splitCount: number
  childCount: number
  passedThroughCount: number
  rotatedCount: number
  normalizedCount: number
  ocrCompletedCount: number
  skippedCount: number
  reviewNeededCount: number
  failedCount: number
  currentPass: number
  maxPasses: number
  completedPasses: number[]
  sourceFolderIds: string[]
  collectionName: string | null
  collectionNotes: string | null
}

export interface ProcessBatchStatus {
  batchId: string
  batchName: string | null
  startedBy: string | null
  createdAt: string | null
  pipelineRequestedStages: string[]
  ingester: ProcessStageStatus | null
  documentSplitter: ProcessStageStatus | null
  pageRotator: ProcessStageStatus | null
  ocrProcessor: ProcessStageStatus | null
}

type SelectedBatchFields = {
  id: string
  name: string | null
  started_by: string | null
  created_at: Date | null
  processing_details: string | null
}

interface ProcessStageCollectionDetails {
  name?: string | null
  notes?: string | null
}

interface ProcessStageCallbackDetails {
  delivery_status?: string | null
  notified_at?: string | null
  received_at?: string | null
  http_status?: unknown
  error_type?: string | null
  error_message?: string | null
}

interface ProcessStageDetails {
  status?: string
  request_id?: string | null
  requested_by_app?: string | null
  initiated_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  last_transition_at?: string | null
  source_folder_ids?: unknown
  collection?: ProcessStageCollectionDetails | null
  processed_count?: unknown
  ingested_count?: unknown
  duplicate_count?: unknown
  skipped_same_origin_count?: unknown
  split_count?: unknown
  child_count?: unknown
  passed_through_count?: unknown
  rotated_count?: unknown
  normalized_count?: unknown
  ocr_completed_count?: unknown
  skipped_count?: unknown
  review_needed_count?: unknown
  failed_count?: unknown
  current_pass?: unknown
  max_passes?: unknown
  completed_passes?: unknown
  error?: string | null
  callback?: ProcessStageCallbackDetails | null
}

interface ProcessPipelineDetails {
  requested_stages?: unknown
}

interface ProcessBatchDetails {
  pipeline?: ProcessPipelineDetails | null
  ingester?: ProcessStageDetails | null
  document_splitter?: ProcessStageDetails | null
  page_rotator?: ProcessStageDetails | null
  ocr_processor?: ProcessStageDetails | null
}

function parseProcessingDetails(raw: string | null): ProcessBatchDetails {
  if (!raw?.trim()) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as ProcessBatchDetails) : {}
  } catch {
    return {}
  }
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []
}

function parseNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
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

function parseStageCallbackFields(stage: ProcessStageDetails): Pick<
  ProcessStageStatus,
  | 'callbackDeliveryStatus'
  | 'callbackNotifiedAt'
  | 'callbackReceivedAt'
  | 'callbackHttpStatus'
  | 'callbackErrorType'
  | 'callbackErrorMessage'
> {
  return {
    callbackDeliveryStatus: normalizeText(stage.callback?.delivery_status ?? null),
    callbackNotifiedAt: normalizeText(stage.callback?.notified_at ?? null),
    callbackReceivedAt: normalizeText(stage.callback?.received_at ?? null),
    callbackHttpStatus:
      typeof stage.callback?.http_status === 'number' && Number.isFinite(stage.callback.http_status)
        ? stage.callback.http_status
        : null,
    callbackErrorType: normalizeText(stage.callback?.error_type ?? null),
    callbackErrorMessage: normalizeText(stage.callback?.error_message ?? null),
  }
}

function parseStageCountFields(stage: ProcessStageDetails): Pick<
  ProcessStageStatus,
  | 'processedCount'
  | 'ingestedCount'
  | 'duplicateCount'
  | 'skippedSameOriginCount'
  | 'splitCount'
  | 'childCount'
  | 'passedThroughCount'
  | 'rotatedCount'
  | 'normalizedCount'
  | 'ocrCompletedCount'
  | 'skippedCount'
  | 'reviewNeededCount'
  | 'failedCount'
> {
  return {
    processedCount: parseNumber(stage.processed_count),
    ingestedCount: parseNumber(stage.ingested_count),
    duplicateCount: parseNumber(stage.duplicate_count),
    skippedSameOriginCount: parseNumber(stage.skipped_same_origin_count),
    splitCount: parseNumber(stage.split_count),
    childCount: parseNumber(stage.child_count),
    passedThroughCount: parseNumber(stage.passed_through_count),
    rotatedCount: parseNumber(stage.rotated_count),
    normalizedCount: parseNumber(stage.normalized_count),
    ocrCompletedCount: parseNumber(stage.ocr_completed_count),
    skippedCount: parseNumber(stage.skipped_count),
    reviewNeededCount: parseNumber(stage.review_needed_count),
    failedCount: parseNumber(stage.failed_count),
  }
}

function parseStageCollectionFields(stage: ProcessStageDetails): Pick<
  ProcessStageStatus,
  'collectionName' | 'collectionNotes'
> {
  return {
    collectionName: normalizeText(stage.collection?.name ?? null),
    collectionNotes: normalizeText(stage.collection?.notes ?? null),
  }
}

function parseStageStatus(stage: ProcessStageDetails | null | undefined): ProcessStageStatus | null {
  if (!stage) {
    return null
  }

  const completedPasses = parseStringArray(stage.completed_passes).map((value) => Number(value)).filter(Number.isFinite)

  return {
    status: normalizeText(stage.status),
    requestId: normalizeText(stage.request_id ?? null),
    requestedByApp: normalizeText(stage.requested_by_app ?? null),
    initiatedAt: normalizeText(stage.initiated_at ?? null),
    startedAt: normalizeText(stage.started_at ?? null),
    completedAt: normalizeText(stage.completed_at ?? null),
    lastTransitionAt: normalizeText(stage.last_transition_at ?? null),
    error: normalizeText(stage.error),
    ...parseStageCallbackFields(stage),
    ...parseStageCountFields(stage),
    currentPass: parseNumber(stage.current_pass) || 1,
    maxPasses: parseNumber(stage.max_passes) || 1,
    completedPasses,
    sourceFolderIds: parseStringArray(stage.source_folder_ids),
    ...parseStageCollectionFields(stage),
  }
}

function toProcessBatchStatus(batch: SelectedBatchFields): ProcessBatchStatus {
  const details = parseProcessingDetails(batch.processing_details)

  return {
    batchId: batch.id,
    batchName: normalizeText(batch.name),
    startedBy: normalizeText(batch.started_by),
    createdAt: toIsoString(batch.created_at),
    pipelineRequestedStages: parseStringArray(details.pipeline?.requested_stages),
    ingester: parseStageStatus(details.ingester),
    documentSplitter: parseStageStatus(details.document_splitter),
    pageRotator: parseStageStatus(details.page_rotator),
    ocrProcessor: parseStageStatus(details.ocr_processor),
  }
}

function hasProcessState(batch: ProcessBatchStatus): boolean {
  return (
    batch.pipelineRequestedStages.length > 0 ||
    batch.ingester !== null ||
    batch.documentSplitter !== null ||
    batch.pageRotator !== null ||
    batch.ocrProcessor !== null
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

export async function setProcessBatchRequestedStages(batchId: string, requestedStages: string[]): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: { id: true, processing_details: true },
  })

  if (!batch) {
    throw new Error(`Batch ${batchId} was not found`)
  }

  const details = parseProcessingDetails(batch.processing_details)
  const nextDetails: ProcessBatchDetails = {
    ...details,
    pipeline: {
      ...(details.pipeline ?? {}),
      requested_stages: requestedStages,
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
  stageKey: 'ingester' | 'document_splitter' | 'page_rotator' | 'ocr_processor',
  receivedAtIso: string,
): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: { id: true, processing_details: true },
  })

  if (!batch) {
    throw new Error(`Batch ${batchId} was not found`)
  }

  const details = parseProcessingDetails(batch.processing_details)
  const stageDetails = details[stageKey]
  if (!stageDetails) {
    throw new Error(`Batch ${batchId} does not contain ${stageKey} processing details`)
  }

  const nextDetails: ProcessBatchDetails = {
    ...details,
    [stageKey]: {
      ...stageDetails,
      callback: {
        ...(stageDetails.callback ?? {}),
        received_at: receivedAtIso,
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
