import type { PipelineConfig } from '@lib/pipelineConfig'

export interface RawProcessStageCollectionDetails {
  name?: string | null
  notes?: string | null
}

export interface RawProcessStageCallbackDetails {
  delivery_status?: string | null
  notified_at?: unknown
  received_at?: unknown
  http_status?: unknown
  error_type?: string | null
  error_message?: string | null
}

export interface RawProcessStageDetails {
  status?: string | null
  mode?: string | null
  request_id?: string | null
  requested_by_app?: string | null
  initiated_at?: unknown
  started_at?: unknown
  completed_at?: unknown
  last_transition_at?: unknown
  source_folder_ids?: unknown
  collection?: RawProcessStageCollectionDetails | null
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
  extracted_count?: unknown
  metadata_validated_count?: unknown
  rights_determined_count?: unknown
  needs_review_count?: unknown
  versioned_count?: unknown
  resolved_count?: unknown
  skipped_count?: unknown
  review_needed_count?: unknown
  failed_count?: unknown
  current_pass?: unknown
  max_passes?: unknown
  completed_passes?: unknown
  callback?: RawProcessStageCallbackDetails | null
  error?: string | null
  openai_batch?: RawOpenAIBatchDetails | null
}

export interface RawOpenAIBatchWaveDetails {
  status?: string | null
  openai_batch_id?: string | null
  submitted_at?: unknown
  checked_at?: unknown
  completed_at?: unknown
  processed_count?: unknown
  succeeded_count?: unknown
  failed_count?: unknown
  failures?: RawDocumentFailure[] | null
}

export interface RawOpenAIBatchDetails {
  wave_1?: RawOpenAIBatchWaveDetails | null
  wave_2?: RawOpenAIBatchWaveDetails | null
}

export interface RawDocumentFailure {
  document_id?: string | null
  filename?: string | null
  reason?: string | null
}

export interface RawProcessPipelineDetails {
  requested_stages?: unknown
  config?: unknown
}

export interface RawProcessBatchDetails {
  pipeline?: RawProcessPipelineDetails | null
  data_ingester?: RawProcessStageDetails | null
  ingester?: RawProcessStageDetails | null
  document_splitter_pass_1?: RawProcessStageDetails | null
  document_splitter_pass_2?: RawProcessStageDetails | null
  document_splitter?: RawProcessStageDetails | null
  page_rotator_pass_1?: RawProcessStageDetails | null
  page_rotator_pass_2?: RawProcessStageDetails | null
  page_rotator?: RawProcessStageDetails | null
  ocr_processor?: RawProcessStageDetails | null
  content_dedup?: RawProcessStageDetails | null
  metadata_extractor?: RawProcessStageDetails | null
  metadata_validator?: RawProcessStageDetails | null
  rights_determinator?: RawProcessStageDetails | null
  fedora_ingester?: RawProcessStageDetails | null
}

export interface PipelineCallbackBody {
  batch_id?: unknown
  request_id?: unknown
  status?: unknown
  error?: unknown
}

export type CallbackStageKey =
  | 'ingester'
  | 'document_splitter'
  | 'page_rotator'
  | 'ocr_processor'
  | 'content_dedup'
  | 'metadata_extractor'
  | 'metadata_validator'
  | 'rights_determinator'
  | 'fedora_ingester'

export interface NormalizedProcessStageStatus {
  status: string | null
  mode: string | null
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
  extractedCount: number
  metadataValidatedCount: number
  rightsDeterminedCount: number
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
  pipelineRequestedStages: string[]
  pipelineConfig: PipelineConfig | null
  ingester: NormalizedProcessStageStatus | null
  documentSplitter: NormalizedProcessStageStatus | null
  pageRotator: NormalizedProcessStageStatus | null
  ocrProcessor: NormalizedProcessStageStatus | null
  contentDedup: NormalizedProcessStageStatus | null
  metadataExtractor: NormalizedProcessStageStatus | null
  metadataValidator: NormalizedProcessStageStatus | null
  rightsDeterminator: NormalizedProcessStageStatus | null
  fedoraIngester?: NormalizedProcessStageStatus | null
}

export type ProcessStageStatus = NormalizedProcessStageStatus

export interface ProcessBatchStatus extends NormalizedProcessBatchDetails {
  batchId: string
  batchName: string | null
  startedBy: string | null
  createdAt: string | null
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
}

export type PassStagePrefix = 'document_splitter' | 'page_rotator'
