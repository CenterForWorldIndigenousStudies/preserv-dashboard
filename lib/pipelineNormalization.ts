import { parsePipelineConfig } from '@lib/pipelineConfig'
import type {
  CallbackStageKey,
  NormalizedDocumentFailure,
  NormalizedOpenAIBatchWaveStatus,
  NormalizedProcessBatchDetails,
  NormalizedProcessStageStatus,
  PassStagePrefix,
  RawOpenAIBatchWaveDetails,
  RawProcessBatchDetails,
  RawProcessStageDetails,
} from 'types/pipelineContracts'

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

function parseStageCallbackFields(
  stage: RawProcessStageDetails,
): Pick<
  NormalizedProcessStageStatus,
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
  stage: RawProcessStageDetails,
): Pick<
  NormalizedProcessStageStatus,
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
  | 'extractedCount'
  | 'metadataValidatedCount'
  | 'rightsDeterminedCount'
  | 'underReviewCount'
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
    extractedCount: parseNumber(stage.extracted_count),
    metadataValidatedCount: parseNumber(stage.metadata_validated_count),
    rightsDeterminedCount: parseNumber(stage.rights_determined_count),
    underReviewCount: parseNumber(stage.under_review_count),
    versionedCount: parseNumber(stage.versioned_count),
    resolvedCount: parseNumber(stage.resolved_count),
    skippedCount: parseNumber(stage.skipped_count),
    reviewNeededCount: parseNumber(stage.review_needed_count),
    failedCount: parseNumber(stage.failed_count),
  }
}

function parseStageCollectionFields(
  stage: RawProcessStageDetails,
): Pick<NormalizedProcessStageStatus, 'collectionName' | 'collectionNotes'> {
  return {
    collectionName: normalizeText(stage.collection?.name ?? null),
    collectionNotes: normalizeText(stage.collection?.notes ?? null),
  }
}

function parseOpenAIBatchWave(
  wave: RawOpenAIBatchWaveDetails | null | undefined,
): NormalizedOpenAIBatchWaveStatus | null {
  if (!wave) {
    return null
  }

  return {
    status: normalizeText(wave.status),
    openaiBatchId: normalizeText(wave.openai_batch_id),
    submittedAt: parseTimestamp(wave.submitted_at),
    checkedAt: parseTimestamp(wave.checked_at),
    completedAt: parseTimestamp(wave.completed_at),
    processedCount: parseNumber(wave.processed_count),
    succeededCount: parseNumber(wave.succeeded_count),
    failedCount: parseNumber(wave.failed_count),
    failures: parseFailures(wave.failures),
  }
}

function parseFailureText(record: Record<string, unknown>, key: 'document_id' | 'filename' | 'reason'): string | null {
  const value = record[key]
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }

  if (value === null || value === undefined) {
    return null
  }

  return null
}

function parseFailures(value: unknown): NormalizedDocumentFailure[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null
      }

      const record = item as Record<string, unknown>

      return {
        documentId: normalizeText(parseFailureText(record, 'document_id')),
        filename: normalizeText(parseFailureText(record, 'filename')),
        reason: normalizeText(parseFailureText(record, 'reason')),
      }
    })
    .filter((item): item is NormalizedDocumentFailure => item !== null)
}

export function normalizeStage(stage: RawProcessStageDetails | null | undefined): NormalizedProcessStageStatus | null {
  if (!stage) {
    return null
  }

  const completedPasses = parseStringArray(stage.completed_passes)
    .map((value) => Number(value))
    .filter(Number.isFinite)

  return {
    status: normalizeText(stage.status),
    mode: normalizeText(stage.mode),
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
    openaiBatchWave1: parseOpenAIBatchWave(stage.openai_batch?.wave_1),
    openaiBatchWave2: parseOpenAIBatchWave(stage.openai_batch?.wave_2),
  }
}

export function getPassStageEntries(
  details: RawProcessBatchDetails,
  prefix: PassStagePrefix,
): Array<{ key: string; passNumber: number; details: RawProcessStageDetails }> {
  const entries: Array<{ key: string; passNumber: number; details: RawProcessStageDetails }> = []

  for (const [key, value] of Object.entries(details)) {
    if (!key.startsWith(`${prefix}_pass_`) || !value || typeof value !== 'object') {
      continue
    }

    const rawPass = key.slice(`${prefix}_pass_`.length)
    const passNumber = Number(rawPass)
    if (!Number.isFinite(passNumber) || passNumber < 1) {
      continue
    }

    entries.push({ key, passNumber, details: value as RawProcessStageDetails })
  }

  return entries.sort((left, right) => left.passNumber - right.passNumber)
}

export function normalizePassStage(
  details: RawProcessBatchDetails,
  prefix: PassStagePrefix,
): NormalizedProcessStageStatus | null {
  const entries = getPassStageEntries(details, prefix)
  const latestEntry = entries.at(-1)
  const latestStage = latestEntry?.details ?? details[prefix] ?? null
  const parsed = normalizeStage(latestStage)
  if (!parsed) {
    return null
  }

  if (entries.length === 0) {
    return parsed
  }

  const inferredCompletedPasses = entries
    .filter((entry) => {
      const status = entry.details.status?.trim()
      return status === 'completed'
    })
    .map((entry) => entry.passNumber)

  return {
    ...parsed,
    currentPass: parseNumber(latestEntry?.details.current_pass) || latestEntry?.passNumber || parsed.currentPass,
    maxPasses: parseNumber(latestEntry?.details.max_passes) || entries.length || parsed.maxPasses,
    completedPasses: parsed.completedPasses.length > 0 ? parsed.completedPasses : inferredCompletedPasses,
  }
}

export function parseProcessingDetails(raw: string | null): RawProcessBatchDetails {
  if (!raw?.trim()) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function normalizeProcessBatchDetails(details: RawProcessBatchDetails): NormalizedProcessBatchDetails {
  return {
    pipelineRequestedStages: parseStringArray(details.pipeline?.requested_stages),
    pipelineConfig: parsePipelineConfig(details.pipeline?.config),
    ingester: normalizeStage(details.data_ingester ?? details.ingester),
    documentSplitter: normalizePassStage(details, 'document_splitter'),
    pageRotator: normalizePassStage(details, 'page_rotator'),
    ocrProcessor: normalizeStage(details.ocr_processor),
    contentDedup: normalizeStage(details.content_dedup),
    metadataExtractor: normalizeStage(details.metadata_extractor),
    metadataValidator: normalizeStage(details.metadata_validator),
    rightsDeterminator: normalizeStage(details.rights_determinator),
    fedoraIngester: normalizeStage(details.fedora_ingester),
  }
}

const DIRECT_STAGE_DETAIL_KEYS: Record<Exclude<CallbackStageKey, 'ingester' | 'document_splitter' | 'page_rotator'>, keyof RawProcessBatchDetails> = {
  ocr_processor: 'ocr_processor',
  content_dedup: 'content_dedup',
  metadata_extractor: 'metadata_extractor',
  metadata_validator: 'metadata_validator',
  rights_determinator: 'rights_determinator',
  fedora_ingester: 'fedora_ingester',
}

export function resolveStageDetailKey(details: RawProcessBatchDetails, stageKey: CallbackStageKey): string | null {
  if (stageKey === 'ingester') {
    return details.data_ingester ? 'data_ingester' : details.ingester ? 'ingester' : null
  }

  if (stageKey === 'document_splitter' || stageKey === 'page_rotator') {
    const latestEntry = getPassStageEntries(details, stageKey).at(-1)
    return latestEntry?.key ?? (details[stageKey] ? stageKey : null)
  }

  const directKey = DIRECT_STAGE_DETAIL_KEYS[stageKey]
  return details[directKey] ? directKey : null
}
