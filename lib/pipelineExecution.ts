import {
  CONTENT_DEDUP_SERVICE,
  DATA_COMBINER_SERVICE,
  DATA_INGESTER_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  FEDORA_INGESTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  PAGE_ROTATOR_SERVICE,
  CUSTOM_PIPELINE_PROFILE_ID,
  METADATA_EXTRACTION_MODES,
  PIPELINE_CONFIG_MODES,
  getPipelineServiceDefinition,
  SUPPORTED_DOWNSTREAM_SERVICES,
  getServiceIdForCallbackStage,
} from '@constants/pipeline'
import { BATCH_ROLLBACK_STATUSES } from '@constants/batchRollbackStatuses'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import {
  PIPELINE_STAGE_STATUSES,
  type PipelineStepRuntimeStatus,
} from '@constants/pipelineStageStatuses'
import {
  type PipelineConfig,
  type PipelineExecutionStep,
} from '@lib/pipelineConfig'
import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'
import {
  getReprocessingPipelineConfig,
} from '@lib/reprocessingDrafts'
import type { CallbackStageKey, ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

export type { PipelineStepRuntimeStatus } from '@constants/pipelineStageStatuses'

const INGESTER_STEP_LABEL = getPipelineServiceDefinition(DATA_INGESTER_SERVICE).label

const ORCHESTRATED_SERVICES = new Set<string>([
  DATA_INGESTER_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  PAGE_ROTATOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  CONTENT_DEDUP_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
])

const INGEST_ONLY_PIPELINE_CONFIG: PipelineConfig = {
  profileId: CUSTOM_PIPELINE_PROFILE_ID,
  mode: PIPELINE_CONFIG_MODES.CUSTOM,
  metadataExtraction: {
    mode: METADATA_EXTRACTION_MODES.DIRECT,
  },
  executionPlan: [
    {
      id: 'step-ingester',
      stepId: DATA_INGESTER_SERVICE,
      service: DATA_INGESTER_SERVICE,
      label: INGESTER_STEP_LABEL,
      order: 0,
      enabled: true,
    },
  ],
}

const REPROCESSING_INGESTER_STEP: PipelineExecutionStep = {
  id: 'reprocess-ingester',
  stepId: DATA_INGESTER_SERVICE,
  service: DATA_INGESTER_SERVICE,
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
  const requestedStages = batch.pipelineRequestedStages.filter(
    (stage): stage is CallbackStageKey => stage !== DATA_COMBINER_SERVICE,
  )
  const restartStage = requestedStages[0]
  if (restartStage && isReprocessingExecution(batch)) {
    return getReprocessingPipelineConfig(restartStage, requestedStages)
  }

  const executionPlan = requestedStages.flatMap((requestedStage, index) => {
    const service = getServiceIdForCallbackStage(requestedStage)
    if (!service) return []
    if (!SUPPORTED_DOWNSTREAM_SERVICES.includes(service as (typeof SUPPORTED_DOWNSTREAM_SERVICES)[number])) return []
    const serviceDefinition = getPipelineServiceDefinition(service)

    return [{
      id: `requested-stage-${index}`,
      stepId: service,
      service,
      label: serviceDefinition.label,
      order: index,
      enabled: true,
    } satisfies PipelineExecutionStep]
  })

  return executionPlan.length > 0
    ? {
        profileId: CUSTOM_PIPELINE_PROFILE_ID,
        mode: PIPELINE_CONFIG_MODES.CUSTOM,
        metadataExtraction: { mode: METADATA_EXTRACTION_MODES.DIRECT },
        executionPlan,
      }
    : null
}

function normalizeRuntimeStatus(status: string | null | undefined): PipelineStepRuntimeStatus {
  switch (status) {
    case PIPELINE_STAGE_STATUSES.ACCEPTED:
    case PIPELINE_STAGE_STATUSES.QUEUED:
      return PIPELINE_STAGE_STATUSES.QUEUED
    case PIPELINE_STAGE_STATUSES.RUNNING:
      return PIPELINE_STAGE_STATUSES.RUNNING
    case PIPELINE_STAGE_STATUSES.COMPLETED:
      return PIPELINE_STAGE_STATUSES.COMPLETED
    case PIPELINE_STAGE_STATUSES.FAILED:
      return PIPELINE_STAGE_STATUSES.FAILED
    case PIPELINE_STAGE_STATUSES.REVIEW_NEEDED:
      return PIPELINE_STAGE_STATUSES.REVIEW_NEEDED
    default:
      return PIPELINE_STAGE_STATUSES.PENDING
  }
}

function getStageForService(
  batch: ProcessBatchStatus,
  service: PipelineExecutionStep['service'],
): ProcessStageStatus | null {
  switch (service) {
    case DATA_INGESTER_SERVICE:
      return batch.ingester
    case DOCUMENT_SPLITTER_SERVICE:
      return batch.documentSplitter
    case PAGE_ROTATOR_SERVICE:
      return batch.pageRotator
    case OCR_PROCESSOR_SERVICE:
      return batch.ocrProcessor
    case CONTENT_DEDUP_SERVICE:
      return batch.contentDedup
    case METADATA_EXTRACTOR_SERVICE:
      return batch.metadataExtractor
    case FEDORA_INGESTER_SERVICE:
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

  if (isReprocessingExecution(batch) && !executionPlan.some((step) => step.service === DATA_INGESTER_SERVICE)) {
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
      (stage.currentPass === step.pass && stage.status === PIPELINE_STAGE_STATUSES.COMPLETED)
    )
  }

  return stage.status === PIPELINE_STAGE_STATUSES.COMPLETED
}

export function getExecutionStepRuntimeStatus(
  batch: ProcessBatchStatus,
  step: PipelineExecutionStep,
): PipelineStepRuntimeStatus {
  if (isExecutionStepCompleted(batch, step)) {
    return PIPELINE_STAGE_STATUSES.COMPLETED
  }

  const stage = getStageForService(batch, step.service)
  if (!stage?.status) {
    return PIPELINE_STAGE_STATUSES.PENDING
  }

  if (step.pass) {
    const matchesCurrentPass = stage.currentPass === step.pass
    if (!matchesCurrentPass) {
      return PIPELINE_STAGE_STATUSES.PENDING
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
    ]).has(batch.lifecycleStatus ?? '')
  ) {
    return null
  }

  const executionPlan = getOrchestratedExecutionPlan(batch)

  for (const step of executionPlan) {
    if (step.service === DATA_INGESTER_SERVICE) {
      continue
    }

    if (!areExecutionStepDependenciesSatisfied(batch, step, executionPlan)) {
      continue
    }

    const runtimeStatus = getExecutionStepRuntimeStatus(batch, step)
    if (runtimeStatus === PIPELINE_STAGE_STATUSES.COMPLETED) {
      continue
    }

    return runtimeStatus === PIPELINE_STAGE_STATUSES.PENDING ? step : null
  }

  return null
}

export function isExecutionStepTerminal(batch: ProcessBatchStatus, step: PipelineExecutionStep): boolean {
  const runtimeStatus = getExecutionStepRuntimeStatus(batch, step)
  return (
    runtimeStatus === PIPELINE_STAGE_STATUSES.COMPLETED ||
    runtimeStatus === PIPELINE_STAGE_STATUSES.FAILED ||
    runtimeStatus === PIPELINE_STAGE_STATUSES.REVIEW_NEEDED
  )
}

export function hasTerminalPipelineFailure(batch: ProcessBatchStatus): boolean {
  return getOrchestratedExecutionPlan(batch).some((step) => {
    const runtimeStatus = getExecutionStepRuntimeStatus(batch, step)
    return (
      runtimeStatus === PIPELINE_STAGE_STATUSES.FAILED ||
      runtimeStatus === PIPELINE_STAGE_STATUSES.REVIEW_NEEDED
    )
  })
}

export function isPipelineBatchTerminal(batch: ProcessBatchStatus): boolean {
  if (
    new Set<string>([
      BATCH_ROLLBACK_STATUSES.REQUESTED,
      BATCH_ROLLBACK_STATUSES.DRAINING,
      BATCH_ROLLBACK_STATUSES.ROLLBACK_IN_PROGRESS,
    ]).has(batch.rollbackStatus ?? '')
  ) {
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
    batch.rollbackStatus === BATCH_ROLLBACK_STATUSES.FAILED
  ) {
    return true
  }

  const executionPlan = getOrchestratedExecutionPlan(batch)
  if (executionPlan.length === 0) {
    return false
  }

  const ingesterStep = executionPlan.find((step) => step.service === DATA_INGESTER_SERVICE)
  if (!ingesterStep || !isExecutionStepTerminal(batch, ingesterStep)) {
    return false
  }

  const ingesterStatus = getExecutionStepRuntimeStatus(batch, ingesterStep)
  if (
    ingesterStatus === PIPELINE_STAGE_STATUSES.FAILED ||
    ingesterStatus === PIPELINE_STAGE_STATUSES.REVIEW_NEEDED
  ) {
    return true
  }

  if (hasTerminalPipelineFailure(batch)) {
    return true
  }

  return executionPlan.every((step) => isExecutionStepTerminal(batch, step))
}
