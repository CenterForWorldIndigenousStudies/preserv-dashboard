import { parsePipelineConfig } from '@lib/pipelineConfig'
import {
  DATA_INGESTER_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  PAGE_ROTATOR_SERVICE,
} from '@constants/pipeline'
import type {
  CallbackStageKey,
  NormalizedDocumentFailure,
  NormalizedOpenAIBatchWaveStatus,
  NormalizedPipelineExecution,
  NormalizedProcessBatchDetails,
  NormalizedProcessStageStatus,
  PassStagePrefix,
  RawOpenAIBatchWaveDetails,
  RawProcessBatchDetails,
  RawProcessPipelineDetails,
  RawProcessStageDetails,
} from 'types/pipelineContracts'

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []
}

function parseNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
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
  const callbackHttpStatus = stage.callback?.httpStatus

  return {
    callbackDeliveryStatus: normalizeText(stage.callback?.deliveryStatus),
    callbackNotifiedAt: parseTimestamp(stage.callback?.notifiedAt),
    callbackReceivedAt: parseTimestamp(stage.callback?.receivedAt),
    callbackHttpStatus:
      typeof callbackHttpStatus === 'number' && Number.isFinite(callbackHttpStatus)
        ? callbackHttpStatus
        : null,
    callbackErrorType: normalizeText(stage.callback?.errorType),
    callbackErrorMessage: normalizeText(stage.callback?.errorMessage),
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
  | 'needsReviewCount'
  | 'versionedCount'
  | 'resolvedCount'
  | 'skippedCount'
  | 'reviewNeededCount'
  | 'failedCount'
> {
  return {
    processedCount: parseNumber(stage.processedCount),
    ingestedCount: parseNumber(stage.ingestedCount),
    duplicateCount: parseNumber(stage.duplicateCount),
    exactDuplicateCount: parseNumber(stage.exactDuplicateCount),
    skippedSameOriginCount: parseNumber(stage.skippedSameOriginCount),
    splitCount: parseNumber(stage.splitCount),
    childCount: parseNumber(stage.childCount),
    passedThroughCount: parseNumber(stage.passedThroughCount),
    rotatedCount: parseNumber(stage.rotatedCount),
    normalizedCount: parseNumber(stage.normalizedCount),
    ocrCompletedCount: parseNumber(stage.ocrCompletedCount),
    extractedCount: parseNumber(stage.extractedCount),
    needsReviewCount: parseNumber(stage.needsReviewCount),
    versionedCount: parseNumber(stage.versionedCount),
    resolvedCount: parseNumber(stage.resolvedCount),
    skippedCount: parseNumber(stage.skippedCount),
    reviewNeededCount: parseNumber(stage.reviewNeededCount),
    failedCount: parseNumber(stage.failedCount),
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
    openaiBatchId: normalizeText(wave.openaiBatchId),
    submittedAt: parseTimestamp(wave.submittedAt),
    checkedAt: parseTimestamp(wave.checkedAt),
    completedAt: parseTimestamp(wave.completedAt),
    processedCount: parseNumber(wave.processedCount),
    succeededCount: parseNumber(wave.succeededCount),
    failedCount: parseNumber(wave.failedCount),
    failures: parseFailures(wave.failures),
  }
}

function parseFailureText(record: Record<string, unknown>, key: 'documentId' | 'filename' | 'reason'): string | null {
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
        documentId: normalizeText(parseFailureText(record, 'documentId')),
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

  const completedPasses = parseStringArray(stage.completedPasses)
    .map((value) => Number(value))
    .filter(Number.isFinite)

  return {
    status: normalizeText(stage.status),
    mode: normalizeText(stage.mode),
    requestId: normalizeText(stage.requestId),
    operationId: normalizeText(stage.operationId),
    idempotencyKey: normalizeText(stage.idempotencyKey),
    executionMode: normalizeText(stage.executionMode),
    requestedByApp: normalizeText(stage.requestedByApp),
    initiatedAt: parseTimestamp(stage.initiatedAt),
    startedAt: parseTimestamp(stage.startedAt),
    completedAt: parseTimestamp(stage.completedAt),
    lastTransitionAt: parseTimestamp(stage.lastTransitionAt),
    error: normalizeText(stage.error),
    ...parseStageCallbackFields(stage),
    ...parseStageCountFields(stage),
    currentPass: parseNumber(stage.currentPass) || 1,
    maxPasses: parseNumber(stage.maxPasses) || 1,
    completedPasses,
    sourceFolderIds: parseStringArray(stage.sourceFolderIds),
    ...parseStageCollectionFields(stage),
    openaiBatchWave1: parseOpenAIBatchWave(stage.openaiBatch?.wave1),
    openaiBatchWave2: parseOpenAIBatchWave(stage.openaiBatch?.wave2),
  }
}

function normalizePipelineExecution(
  execution: RawProcessPipelineDetails['currentExecution'],
): NormalizedPipelineExecution | null {
  if (!execution || typeof execution !== 'object') {
    return null
  }

  return {
    executionMode: normalizeText(execution.executionMode),
    operationId: normalizeText(execution.operationId),
    idempotencyKey: normalizeText(execution.idempotencyKey),
    stage: normalizeText(execution.stage),
    reason: normalizeText(execution.reason),
    sourceDocumentIds: parseStringArray(execution.sourceDocumentIds),
  }
}

function stagePrefix(prefix: PassStagePrefix): string {
  if (prefix === 'document_splitter') {
    return 'documentSplitterPass'
  }
  return 'pageRotatorPass'
}

export function getPassStageEntries(
  details: RawProcessBatchDetails,
  prefix: PassStagePrefix,
): Array<{ key: string; passNumber: number; details: RawProcessStageDetails }> {
  const entries: Array<{ key: string; passNumber: number; details: RawProcessStageDetails }> = []
  const keyPrefix = stagePrefix(prefix)

  for (const [key, value] of Object.entries(details)) {
    if (!key.startsWith(keyPrefix) || !value || typeof value !== 'object') {
      continue
    }

    const rawPass = key.slice(keyPrefix.length)
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
  const directKey = prefix === 'document_splitter' ? 'documentSplitter' : 'pageRotator'
  const latestStage = latestEntry?.details ?? details[directKey] ?? null
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
    currentPass:
      parseNumber(latestEntry?.details.currentPass) ||
      latestEntry?.passNumber ||
      parsed.currentPass,
    maxPasses:
      parseNumber(latestEntry?.details.maxPasses) ||
      entries.length ||
      parsed.maxPasses,
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
  const hasLegacyImport = details.legacyImport !== null && details.legacyImport !== undefined
  const pipeline = details.pipeline

  return {
    pipelineExecutionMode:
      normalizeText(pipeline?.executionMode) ??
      (hasLegacyImport ? 'legacy_import' : null),
    legacyImportStatus: normalizeText(details.legacyImport?.status),
    pipelineRequestedStages: parseStringArray(pipeline?.requestedStages),
    pipelineConfig: parsePipelineConfig(pipeline?.config),
    currentExecution: normalizePipelineExecution(pipeline?.currentExecution),
    ingester: normalizeStage(details.dataIngester),
    documentSplitter: normalizePassStage(details, 'document_splitter'),
    pageRotator: normalizePassStage(details, 'page_rotator'),
    ocrProcessor: normalizeStage(details.ocrProcessor),
    contentDedup: normalizeStage(details.contentDedup),
    metadataExtractor: normalizeStage(details.metadataExtractor),
    fedoraIngester: normalizeStage(details.fedoraIngester),
  }
}

const DIRECT_STAGE_DETAIL_KEYS: Record<
  Exclude<
    CallbackStageKey,
    typeof DATA_INGESTER_SERVICE | typeof DOCUMENT_SPLITTER_SERVICE | typeof PAGE_ROTATOR_SERVICE
  >,
  keyof RawProcessBatchDetails
> = {
  ocr_processor: 'ocrProcessor',
  content_dedup: 'contentDedup',
  metadata_extractor: 'metadataExtractor',
  fedora_ingester: 'fedoraIngester',
}

export function resolveStageDetailKey(details: RawProcessBatchDetails, stageKey: CallbackStageKey): string | null {
  if (stageKey === DATA_INGESTER_SERVICE) {
    return details.dataIngester ? 'dataIngester' : null
  }

  if (stageKey === DOCUMENT_SPLITTER_SERVICE || stageKey === PAGE_ROTATOR_SERVICE) {
    const latestEntry = getPassStageEntries(details, stageKey).at(-1)
    const directKey = stageKey === DOCUMENT_SPLITTER_SERVICE ? 'documentSplitter' : 'pageRotator'
    return latestEntry?.key ?? (details[directKey] ? directKey : null)
  }

  const directKey = DIRECT_STAGE_DETAIL_KEYS[stageKey]
  return details[directKey] ? directKey : null
}
