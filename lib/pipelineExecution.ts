import {
  CONTENT_DEDUP_STAGE,
  DOCUMENT_SPLITTER_STAGE,
  FEDORA_INGESTER_STAGE,
  INGESTER_STAGE,
  METADATA_EXTRACTOR_STAGE,
  OCR_PROCESSOR_STAGE,
  PAGE_ROTATOR_STAGE,
  getStepDefinition,
} from '@constants/pipeline'
import { getPipelineServiceDisplayNameForService } from '@constants/pipelineServices'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { GENERATED_BATCH_PUBLICATION_STATUSES } from '@constants/generated/batchPublicationStatuses'
import {
  type PipelineConfig,
  type PipelineExecutionStep,
} from '@lib/pipelineConfig'
import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

export type PipelineStepRuntimeStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'review_needed'

const INGESTER_STEP_LABEL = getStepDefinition(INGESTER_STAGE)?.label ?? ''

const ORCHESTRATED_SERVICES = new Set<string>([
  INGESTER_STAGE,
  DOCUMENT_SPLITTER_STAGE,
  PAGE_ROTATOR_STAGE,
  OCR_PROCESSOR_STAGE,
  CONTENT_DEDUP_STAGE,
  METADATA_EXTRACTOR_STAGE,
])

const INGEST_ONLY_PIPELINE_CONFIG: PipelineConfig = {
  profileId: 'custom',
  mode: 'custom',
  metadataExtraction: {
    mode: 'direct',
  },
  executionPlan: [
    {
      id: 'step-ingester',
      stepId: 'ingester',
      service: INGESTER_STAGE,
      label: INGESTER_STEP_LABEL,
      order: 0,
      enabled: true,
    },
  ],
}

const REQUESTED_STAGE_SERVICES: Record<string, PipelineExecutionStep['service']> = {
  'document-splitter': DOCUMENT_SPLITTER_STAGE,
  document_splitter: DOCUMENT_SPLITTER_STAGE,
  'page-rotator': PAGE_ROTATOR_STAGE,
  page_rotator: PAGE_ROTATOR_STAGE,
  'ocr-processor': OCR_PROCESSOR_STAGE,
  ocr_processor: OCR_PROCESSOR_STAGE,
  'content-dedup': CONTENT_DEDUP_STAGE,
  content_dedup: CONTENT_DEDUP_STAGE,
  'metadata-extraction': METADATA_EXTRACTOR_STAGE,
  metadata_extractor: METADATA_EXTRACTOR_STAGE,
}

const REPROCESSING_INGESTER_STEP: PipelineExecutionStep = {
  id: 'reprocess-ingester',
  stepId: 'ingester',
  service: INGESTER_STAGE,
  label: INGESTER_STEP_LABEL,
  order: -1,
  enabled: true,
}

function isReprocessingExecution(batch: ProcessBatchStatus): boolean {
  return (
    batch.pipelineExecutionMode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS ||
    batch.currentExecution?.executionMode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS
  )
}

function getRequestedStagesPipelineConfig(batch: ProcessBatchStatus): PipelineConfig | null {
  const executionPlan = batch.pipelineRequestedStages.flatMap((requestedStage, index) => {
    const service = REQUESTED_STAGE_SERVICES[requestedStage]
    if (!service) {
      return []
    }

    return [
      {
        id: `requested-stage-${index}`,
        stepId: service === DOCUMENT_SPLITTER_STAGE || service === PAGE_ROTATOR_STAGE ? 'normalize-pass-1' : service,
        service,
        label: getPipelineServiceDisplayNameForService(service),
        order: index,
        enabled: true,
      } satisfies PipelineExecutionStep,
    ]
  })

  return executionPlan.length > 0
    ? {
        profileId: 'custom',
        mode: 'custom',
        metadataExtraction: { mode: 'direct' },
        executionPlan,
      }
    : null
}

function normalizeRuntimeStatus(status: string | null | undefined): PipelineStepRuntimeStatus {
  switch (status) {
    case 'accepted':
    case 'queued':
      return 'queued'
    case 'running':
      return 'running'
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'review_needed':
      return 'review_needed'
    default:
      return 'pending'
  }
}

function getStageForService(
  batch: ProcessBatchStatus,
  service: PipelineExecutionStep['service'],
): ProcessStageStatus | null {
  switch (service) {
    case INGESTER_STAGE:
      return batch.ingester
    case DOCUMENT_SPLITTER_STAGE:
      return batch.documentSplitter
    case PAGE_ROTATOR_STAGE:
      return batch.pageRotator
    case OCR_PROCESSOR_STAGE:
      return batch.ocrProcessor
    case CONTENT_DEDUP_STAGE:
      return batch.contentDedup
    case METADATA_EXTRACTOR_STAGE:
      return batch.metadataExtractor
    case FEDORA_INGESTER_STAGE:
      return batch.fedoraIngester ?? null
    default:
      return null
  }
}

export function getExecutionStepReviewWarningCount(batch: ProcessBatchStatus, step: PipelineExecutionStep): number {
  const stage = getStageForService(batch, step.service)
  if (!stage || stage.reviewNeededCount <= 0) {
    return 0
  }

  if (!step.pass) {
    return stage.reviewNeededCount
  }

  const latestKnownPass = Math.max(stage.currentPass, ...stage.completedPasses)
  return step.pass === latestKnownPass ? stage.reviewNeededCount : 0
}

export function getPipelineConfigForBatch(batch: ProcessBatchStatus): PipelineConfig {
  return batch.pipelineConfig ?? getRequestedStagesPipelineConfig(batch) ?? INGEST_ONLY_PIPELINE_CONFIG
}

export function getOrchestratedExecutionPlan(batch: ProcessBatchStatus): PipelineExecutionStep[] {
  const executionPlan = getPipelineConfigForBatch(batch)
    .executionPlan.filter((step) => step.enabled && ORCHESTRATED_SERVICES.has(step.service))
    .sort((left, right) => left.order - right.order)

  if (isReprocessingExecution(batch) && !executionPlan.some((step) => step.service === 'ingester')) {
    return [REPROCESSING_INGESTER_STEP, ...executionPlan]
  }

  return executionPlan
}

export function getLastEnabledAutomatedExecutionStep(batch: ProcessBatchStatus): PipelineExecutionStep | null {
  return getOrchestratedExecutionPlan(batch).at(-1) ?? null
}

export function shouldFinalizePipelineReadiness(batch: ProcessBatchStatus): boolean {
  const lastStep = getLastEnabledAutomatedExecutionStep(batch)
  if (!lastStep || !isExecutionStepCompleted(batch, lastStep)) {
    return false
  }

  if (hasTerminalPipelineFailure(batch)) {
    return false
  }

  return getNextEligibleExecutionStep(batch) === null
}

export function isExecutionStepCompleted(batch: ProcessBatchStatus, step: PipelineExecutionStep): boolean {
  const stage = getStageForService(batch, step.service)
  if (!stage) {
    return false
  }

  if (step.pass) {
    return (
      stage.completedPasses.includes(step.pass) ||
      stage.currentPass > step.pass ||
      (stage.currentPass === step.pass && stage.status === 'completed')
    )
  }

  return stage.status === 'completed'
}

export function getExecutionStepRuntimeStatus(
  batch: ProcessBatchStatus,
  step: PipelineExecutionStep,
): PipelineStepRuntimeStatus {
  if (isExecutionStepCompleted(batch, step)) {
    return 'completed'
  }

  const stage = getStageForService(batch, step.service)
  if (!stage?.status) {
    return 'pending'
  }

  if (step.pass) {
    const matchesCurrentPass = stage.currentPass === step.pass
    if (!matchesCurrentPass) {
      return 'pending'
    }
  }

  return normalizeRuntimeStatus(stage.status)
}

export function areExecutionStepDependenciesSatisfied(
  batch: ProcessBatchStatus,
  step: PipelineExecutionStep,
  executionPlan: PipelineExecutionStep[] = getOrchestratedExecutionPlan(batch),
): boolean {
  const dependencyIds = step.dependsOn ?? []
  if (dependencyIds.length === 0) {
    return true
  }

  const stepsById = new Map(executionPlan.map((executionStep) => [executionStep.id, executionStep]))

  return dependencyIds.every((dependencyId) => {
    const dependencyStep = stepsById.get(dependencyId)
    if (!dependencyStep || !dependencyStep.enabled) {
      return true
    }

    return isExecutionStepCompleted(batch, dependencyStep)
  })
}

export function getNextEligibleExecutionStep(batch: ProcessBatchStatus): PipelineExecutionStep | null {
  if (
    new Set<string>([
      GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLBACK_REQUESTED,
      GENERATED_BATCH_LIFECYCLE_STATUSES.DRAINING,
      GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLBACK_IN_PROGRESS,
      GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLED_BACK,
      GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLBACK_FAILED,
      GENERATED_BATCH_LIFECYCLE_STATUSES.PUBLICATION_LOCKED,
      GENERATED_BATCH_LIFECYCLE_STATUSES.COMPLETE,
      GENERATED_BATCH_LIFECYCLE_STATUSES.FAILED,
    ]).has(batch.lifecycleStatus ?? '') ||
    new Set<string>([
      GENERATED_BATCH_PUBLICATION_STATUSES.PUBLICATION_LOCKED,
      GENERATED_BATCH_PUBLICATION_STATUSES.PUBLISHED,
      GENERATED_BATCH_PUBLICATION_STATUSES.UNKNOWN,
    ]).has(batch.publicationStatus ?? '')
  ) {
    return null
  }

  const executionPlan = getOrchestratedExecutionPlan(batch)

  for (const step of executionPlan) {
    if (step.service === INGESTER_STAGE) {
      continue
    }

    if (!areExecutionStepDependenciesSatisfied(batch, step, executionPlan)) {
      continue
    }

    const runtimeStatus = getExecutionStepRuntimeStatus(batch, step)
    if (runtimeStatus === 'completed') {
      continue
    }

    return runtimeStatus === 'pending' ? step : null
  }

  return null
}

export function isExecutionStepTerminal(batch: ProcessBatchStatus, step: PipelineExecutionStep): boolean {
  const runtimeStatus = getExecutionStepRuntimeStatus(batch, step)
  return runtimeStatus === 'completed' || runtimeStatus === 'failed' || runtimeStatus === 'review_needed'
}

export function hasTerminalPipelineFailure(batch: ProcessBatchStatus): boolean {
  return getOrchestratedExecutionPlan(batch).some((step) => {
    const runtimeStatus = getExecutionStepRuntimeStatus(batch, step)
    return runtimeStatus === 'failed' || runtimeStatus === 'review_needed'
  })
}

export function isPipelineBatchTerminal(batch: ProcessBatchStatus): boolean {
  if (['requested', 'draining', 'rollback_in_progress'].includes(batch.rollbackStatus ?? '')) {
    return false
  }

  if (
    new Set<string>([
      GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLED_BACK,
      GENERATED_BATCH_LIFECYCLE_STATUSES.COMPLETE,
      GENERATED_BATCH_LIFECYCLE_STATUSES.PUBLISHED,
      GENERATED_BATCH_LIFECYCLE_STATUSES.FAILED,
      GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLBACK_FAILED,
    ]).has(batch.lifecycleStatus ?? '') ||
    batch.rollbackStatus === 'failed' ||
    new Set<string>([GENERATED_BATCH_PUBLICATION_STATUSES.PUBLISHED, GENERATED_BATCH_PUBLICATION_STATUSES.UNKNOWN]).has(
      batch.publicationStatus ?? '',
    )
  ) {
    return true
  }

  const executionPlan = getOrchestratedExecutionPlan(batch)
  if (executionPlan.length === 0) {
    return false
  }

  const ingesterStep = executionPlan.find((step) => step.service === INGESTER_STAGE)
  if (!ingesterStep || !isExecutionStepTerminal(batch, ingesterStep)) {
    return false
  }

  const ingesterStatus = getExecutionStepRuntimeStatus(batch, ingesterStep)
  if (ingesterStatus === 'failed' || ingesterStatus === 'review_needed') {
    return true
  }

  if (hasTerminalPipelineFailure(batch)) {
    return true
  }

  return executionPlan.every((step) => isExecutionStepTerminal(batch, step))
}
