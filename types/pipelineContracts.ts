import type { PipelineConfig } from '@lib/pipelineConfig'
import type { BatchProperty } from 'types/batches'

export interface RawProcessStageCollectionDetails {
  name?: string | null
  notes?: string | null
}

export interface RawProcessStageCallbackDetails {
  deliveryStatus?: string | null
  notifiedAt?: unknown
  receivedAt?: unknown
  httpStatus?: unknown
  errorType?: string | null
  errorMessage?: string | null
}

export interface RawProcessStageDetails {
  status?: string | null
  mode?: string | null
  requestId?: string | null
  operationId?: string | null
  idempotencyKey?: string | null
  executionMode?: string | null
  requestedByApp?: string | null
  initiatedAt?: unknown
  startedAt?: unknown
  completedAt?: unknown
  lastTransitionAt?: unknown
  sourceFolderIds?: unknown
  processedCount?: unknown
  ingestedCount?: unknown
  duplicateCount?: unknown
  exactDuplicateCount?: unknown
  skippedSameOriginCount?: unknown
  splitCount?: unknown
  childCount?: unknown
  passedThroughCount?: unknown
  rotatedCount?: unknown
  normalizedCount?: unknown
  ocrCompletedCount?: unknown
  extractedCount?: unknown
  needsReviewCount?: unknown
  versionedCount?: unknown
  resolvedCount?: unknown
  skippedCount?: unknown
  reviewNeededCount?: unknown
  failedCount?: unknown
  currentPass?: unknown
  maxPasses?: unknown
  completedPasses?: unknown
  collection?: RawProcessStageCollectionDetails | null
  callback?: RawProcessStageCallbackDetails | null
  error?: string | null
  openaiBatch?: RawOpenAIBatchDetails | null
}

export interface RawOpenAIBatchWaveDetails {
  status?: string | null
  openaiBatchId?: string | null
  submittedAt?: unknown
  checkedAt?: unknown
  completedAt?: unknown
  processedCount?: unknown
  succeededCount?: unknown
  failedCount?: unknown
  failures?: RawDocumentFailure[] | null
}

export interface RawOpenAIBatchDetails {
  wave1?: RawOpenAIBatchWaveDetails | null
  wave2?: RawOpenAIBatchWaveDetails | null
}

export interface RawDocumentFailure {
  documentId?: string | null
  filename?: string | null
  reason?: string | null
}

export interface RawProcessPipelineDetails {
  executionMode?: unknown
  source?: {
    system?: unknown
    name?: unknown
    legacyBatchId?: unknown
    registryVersion?: unknown
  } | null
  requestedStages?: unknown
  config?: unknown
  currentExecution?: RawPipelineExecutionDetails | null
  executionHistory?: RawPipelineExecutionDetails[] | null
}

export interface RawLegacyImportDetails {
  status?: unknown
  binaryProcessingDatetime?: unknown
  costSavedUsd?: unknown
  costUsd?: unknown
  totalFiles?: unknown
  uniqueFiles?: unknown
  duplicateFiles?: unknown
  processingTimeSeconds?: unknown
  startedAt?: unknown
  completedAt?: unknown
  [key: string]: unknown
}

export interface RawPipelineExecutionDetails {
  executionMode?: unknown
  operationId?: unknown
  idempotencyKey?: unknown
  sourceDocumentIds?: unknown
  stage?: unknown
  reason?: unknown
}

export interface RawProcessBatchDetails {
  pipeline?: RawProcessPipelineDetails | null
  legacyImport?: RawLegacyImportDetails | null
  dataIngester?: RawProcessStageDetails | null
  documentSplitterPass1?: RawProcessStageDetails | null
  documentSplitterPass2?: RawProcessStageDetails | null
  documentSplitter?: RawProcessStageDetails | null
  pageRotatorPass1?: RawProcessStageDetails | null
  pageRotatorPass2?: RawProcessStageDetails | null
  pageRotator?: RawProcessStageDetails | null
  ocrProcessor?: RawProcessStageDetails | null
  contentDedup?: RawProcessStageDetails | null
  metadataExtractor?: RawProcessStageDetails | null
  fedoraIngester?: RawProcessStageDetails | null
}

export interface PipelineCallbackBody {
  batch_id?: unknown
  request_id?: unknown
  status?: unknown
  error?: unknown
  operation_id?: unknown
  idempotency_key?: unknown
  execution_mode?: unknown
  queue_item_id?: unknown
  stage?: unknown
}

export type CallbackStageKey =
  | 'ingester'
  | 'document_splitter'
  | 'page_rotator'
  | 'ocr_processor'
  | 'content_dedup'
  | 'metadata_extractor'
  | 'fedora_ingester'

export interface NormalizedProcessStageStatus {
  status: string | null
  mode: string | null
  requestId: string | null
  operationId?: string | null
  idempotencyKey?: string | null
  executionMode?: string | null
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
  extractedCount: number
  needsReviewCount: number
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
  openaiBatchWave1: NormalizedOpenAIBatchWaveStatus | null
  openaiBatchWave2: NormalizedOpenAIBatchWaveStatus | null
}

export interface NormalizedOpenAIBatchWaveStatus {
  status: string | null
  openaiBatchId: string | null
  submittedAt: string | null
  checkedAt: string | null
  completedAt: string | null
  processedCount: number
  succeededCount: number
  failedCount: number
  failures: NormalizedDocumentFailure[]
}

export interface NormalizedDocumentFailure {
  documentId: string | null
  filename: string | null
  reason: string | null
}

export interface NormalizedProcessBatchDetails {
  pipelineExecutionMode?: string | null
  legacyImportStatus?: string | null
  pipelineRequestedStages: string[]
  pipelineConfig: PipelineConfig | null
  currentExecution?: NormalizedPipelineExecution | null
  ingester: NormalizedProcessStageStatus | null
  documentSplitter: NormalizedProcessStageStatus | null
  pageRotator: NormalizedProcessStageStatus | null
  ocrProcessor: NormalizedProcessStageStatus | null
  contentDedup: NormalizedProcessStageStatus | null
  metadataExtractor: NormalizedProcessStageStatus | null
  fedoraIngester?: NormalizedProcessStageStatus | null
}

export interface NormalizedPipelineExecution {
  executionMode: string | null
  operationId: string | null
  idempotencyKey: string | null
  stage: string | null
  reason: string | null
  sourceDocumentIds: string[]
}

export type ProcessStageStatus = NormalizedProcessStageStatus

export interface ProcessBatchStatus extends NormalizedProcessBatchDetails {
  batchId: string
  batchName: string | null
  startedBy: string | null
  createdAt: string | null
  startedAt?: string | null
  lifecycleStatus?: string | null
  publicationStatus?: string | null
  publicationTarget?: string | null
  manualEditAfterStart?: boolean
  rollbackStatus?: string | null
  rollbackFailure?: string | null
  rollbackCounts?: {
    restored: number
    deleted: number
    cancelled: number
    conflicts: number
    failed: number
  } | null
  processingProperties?: readonly BatchProperty[]
}

export type PassStagePrefix = 'document_splitter' | 'page_rotator'
