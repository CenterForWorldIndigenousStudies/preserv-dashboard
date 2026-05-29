import { db } from '@lib/db'
import { parsePipelineConfig, pipelineConfigToRequestedStages, type PipelineConfig } from '@lib/pipelineConfig'

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
  exactDuplicateCount: number
  skippedSameOriginCount: number
  splitCount: number
  childCount: number
  passedThroughCount: number
  rotatedCount: number
  normalizedCount: number
  ocrCompletedCount: number
  versionedCount: number
  resolvedCount: number
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
  pipelineConfig: PipelineConfig | null
  ingester: ProcessStageStatus | null
  documentSplitter: ProcessStageStatus | null
  pageRotator: ProcessStageStatus | null
  ocrProcessor: ProcessStageStatus | null
  contentDedup: ProcessStageStatus | null
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
  notified_at?: unknown
  received_at?: unknown
  http_status?: unknown
  error_type?: string | null
  error_message?: string | null
}

interface ProcessStageDetails {
  status?: string
  request_id?: string | null
  requested_by_app?: string | null
  initiated_at?: unknown
  started_at?: unknown
  completed_at?: unknown
  last_transition_at?: unknown
  source_folder_ids?: unknown
  collection?: ProcessStageCollectionDetails | null
  processed_count?: unknown
  ingested_count?: unknown
  duplicate_count?: unknown
  exact_duplicate_count?: unknown
  skipped_same_origin_count?: unknown
  split_count?: unknown
  child_count?: unknown
  passed_through_count?: unknown
  rotated_count?: unknown
  normalized_count?: unknown
  ocr_completed_count?: unknown
  versioned_count?: unknown
  resolved_count?: unknown
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
  config?: unknown
}

interface ProcessBatchDetails {
  pipeline?: ProcessPipelineDetails | null
  data_ingester?: ProcessStageDetails | null
  ingester?: ProcessStageDetails | null
  document_splitter_pass_1?: ProcessStageDetails | null
  document_splitter_pass_2?: ProcessStageDetails | null
  document_splitter?: ProcessStageDetails | null
  page_rotator_pass_1?: ProcessStageDetails | null
  page_rotator_pass_2?: ProcessStageDetails | null
  page_rotator?: ProcessStageDetails | null
  ocr_processor?: ProcessStageDetails | null
  content_dedup?: ProcessStageDetails | null
}

type CallbackStageKey = 'ingester' | 'document_splitter' | 'page_rotator' | 'ocr_processor' | 'content_dedup'

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

function parseTimestamp(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString()
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  if (/^\d+$/.test(normalized)) {
    return new Date(Number(normalized) * 1000).toISOString()
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString()
}

function toIsoString(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

function parseStageCallbackFields(
  stage: ProcessStageDetails,
): Pick<
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
    callbackNotifiedAt: parseTimestamp(stage.callback?.notified_at ?? null),
    callbackReceivedAt: parseTimestamp(stage.callback?.received_at ?? null),
    callbackHttpStatus:
      typeof stage.callback?.http_status === 'number' && Number.isFinite(stage.callback.http_status)
        ? stage.callback.http_status
        : null,
    callbackErrorType: normalizeText(stage.callback?.error_type ?? null),
    callbackErrorMessage: normalizeText(stage.callback?.error_message ?? null),
  }
}

function parseStageCountFields(
  stage: ProcessStageDetails,
): Pick<
  ProcessStageStatus,
  | 'processedCount'
  | 'ingestedCount'
  | 'duplicateCount'
  | 'exactDuplicateCount'
  | 'skippedSameOriginCount'
  | 'splitCount'
  | 'childCount'
  | 'passedThroughCount'
  | 'rotatedCount'
  | 'normalizedCount'
  | 'ocrCompletedCount'
  | 'versionedCount'
  | 'resolvedCount'
  | 'skippedCount'
  | 'reviewNeededCount'
  | 'failedCount'
> {
  return {
    processedCount: parseNumber(stage.processed_count),
    ingestedCount: parseNumber(stage.ingested_count),
    duplicateCount: parseNumber(stage.duplicate_count),
    exactDuplicateCount: parseNumber(stage.exact_duplicate_count),
    skippedSameOriginCount: parseNumber(stage.skipped_same_origin_count),
    splitCount: parseNumber(stage.split_count),
    childCount: parseNumber(stage.child_count),
    passedThroughCount: parseNumber(stage.passed_through_count),
    rotatedCount: parseNumber(stage.rotated_count),
    normalizedCount: parseNumber(stage.normalized_count),
    ocrCompletedCount: parseNumber(stage.ocr_completed_count),
    versionedCount: parseNumber(stage.versioned_count),
    resolvedCount: parseNumber(stage.resolved_count),
    skippedCount: parseNumber(stage.skipped_count),
    reviewNeededCount: parseNumber(stage.review_needed_count),
    failedCount: parseNumber(stage.failed_count),
  }
}

function parseStageCollectionFields(
  stage: ProcessStageDetails,
): Pick<ProcessStageStatus, 'collectionName' | 'collectionNotes'> {
  return {
    collectionName: normalizeText(stage.collection?.name ?? null),
    collectionNotes: normalizeText(stage.collection?.notes ?? null),
  }
}

function parseStageStatus(stage: ProcessStageDetails | null | undefined): ProcessStageStatus | null {
  if (!stage) {
    return null
  }

  const completedPasses = parseStringArray(stage.completed_passes)
    .map((value) => Number(value))
    .filter(Number.isFinite)

  return {
    status: normalizeText(stage.status),
    requestId: normalizeText(stage.request_id ?? null),
    requestedByApp: normalizeText(stage.requested_by_app ?? null),
    initiatedAt: parseTimestamp(stage.initiated_at ?? null),
    startedAt: parseTimestamp(stage.started_at ?? null),
    completedAt: parseTimestamp(stage.completed_at ?? null),
    lastTransitionAt: parseTimestamp(stage.last_transition_at ?? null),
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

function passStageEntries(
  details: ProcessBatchDetails,
  prefix: 'document_splitter' | 'page_rotator',
): Array<{ key: string; passNumber: number; details: ProcessStageDetails }> {
  const entries: Array<{ key: string; passNumber: number; details: ProcessStageDetails }> = []

  for (const [key, value] of Object.entries(details)) {
    if (!key.startsWith(`${prefix}_pass_`) || !value || typeof value !== 'object') {
      continue
    }

    const rawPass = key.slice(`${prefix}_pass_`.length)
    const passNumber = Number(rawPass)
    if (!Number.isFinite(passNumber) || passNumber < 1) {
      continue
    }

    entries.push({ key, passNumber, details: value as ProcessStageDetails })
  }

  return entries.sort((left, right) => left.passNumber - right.passNumber)
}

function parsePassStageStatus(
  details: ProcessBatchDetails,
  prefix: 'document_splitter' | 'page_rotator',
): ProcessStageStatus | null {
  const entries = passStageEntries(details, prefix)
  const latestEntry = entries.at(-1)
  const latestStage = latestEntry?.details ?? (details[prefix] ?? null)
  const parsed = parseStageStatus(latestStage)
  if (!parsed) {
    return null
  }

  if (entries.length === 0) {
    return parsed
  }

  const inferredCompletedPasses = entries
    .filter((entry) => {
      const status = entry.details.status?.trim()
      return status === 'completed' || status === 'review_needed'
    })
    .map((entry) => entry.passNumber)

  return {
    ...parsed,
    currentPass: parseNumber(latestEntry?.details.current_pass) || latestEntry?.passNumber || parsed.currentPass,
    maxPasses: parseNumber(latestEntry?.details.max_passes) || entries.length || parsed.maxPasses,
    completedPasses: parsed.completedPasses.length > 0 ? parsed.completedPasses : inferredCompletedPasses,
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
    pipelineConfig: parsePipelineConfig(details.pipeline?.config),
    ingester: parseStageStatus(details.data_ingester ?? details.ingester),
    documentSplitter: parsePassStageStatus(details, 'document_splitter'),
    pageRotator: parsePassStageStatus(details, 'page_rotator'),
    ocrProcessor: parseStageStatus(details.ocr_processor),
    contentDedup: parseStageStatus(details.content_dedup),
  }
}

function hasProcessState(batch: ProcessBatchStatus): boolean {
  return (
    batch.pipelineRequestedStages.length > 0 ||
    batch.ingester !== null ||
    batch.documentSplitter !== null ||
    batch.pageRotator !== null ||
    batch.ocrProcessor !== null ||
    batch.contentDedup !== null
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

  const nextDetails: ProcessBatchDetails = {
    ...details,
    pipeline: {
      ...(details.pipeline ?? {}),
      requested_stages: requestedStages,
      config: pipelineConfig,
    },
  }

  await db.batches.update({
    where: { id: batchId },
    data: {
      processing_details: JSON.stringify(nextDetails),
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
  return (details.pipeline?.config as ReturnType<typeof getProcessBatchPipelineConfig>) ?? null
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
  const stageDetails = stageDetailKey ? details[stageDetailKey as keyof ProcessBatchDetails] : null
  if (!stageDetailKey || !stageDetails || typeof stageDetails !== 'object') {
    throw new Error(`Batch ${batchId} does not contain ${stageKey} processing details`)
  }
  const currentStageDetails = stageDetails as ProcessStageDetails

  const nextDetails: ProcessBatchDetails = {
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

function resolveStageDetailKey(
  details: ProcessBatchDetails,
  stageKey: CallbackStageKey,
): string | null {
  switch (stageKey) {
    case 'ingester':
      return details.data_ingester ? 'data_ingester' : details.ingester ? 'ingester' : null
    case 'document_splitter': {
      const latest = passStageEntries(details, 'document_splitter').at(-1)
      return latest?.key ?? (details.document_splitter ? 'document_splitter' : null)
    }
    case 'page_rotator': {
      const latest = passStageEntries(details, 'page_rotator').at(-1)
      return latest?.key ?? (details.page_rotator ? 'page_rotator' : null)
    }
    case 'ocr_processor':
      return details.ocr_processor ? 'ocr_processor' : null
    case 'content_dedup':
      return details.content_dedup ? 'content_dedup' : null
  }
}
