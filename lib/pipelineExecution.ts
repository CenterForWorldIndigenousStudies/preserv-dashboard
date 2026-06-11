import {
  CONTENT_DEDUP_STAGE,
  DOCUMENT_SPLITTER_STAGE,
  OCR_PROCESSOR_STAGE,
  PAGE_ROTATOR_STAGE,
} from '@constants/pipeline'
import {
  type PipelineConfig,
  type PipelineExecutionStep,
} from '@lib/pipelineConfig'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

export type PipelineStepRuntimeStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'review_needed'

const ORCHESTRATED_SERVICES = new Set<string>([
  'ingester',
  DOCUMENT_SPLITTER_STAGE,
  PAGE_ROTATOR_STAGE,
  OCR_PROCESSOR_STAGE,
  CONTENT_DEDUP_STAGE,
])

const INGEST_ONLY_PIPELINE_CONFIG: PipelineConfig = {
  profileId: 'custom',
  mode: 'custom',
  executionPlan: [
    {
      id: 'step-ingester',
      stepId: 'ingester',
      service: 'ingester',
      label: 'Ingest',
      order: 0,
      enabled: true,
    },
  ],
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
    case 'ingester':
      return batch.ingester
    case DOCUMENT_SPLITTER_STAGE:
      return batch.documentSplitter
    case PAGE_ROTATOR_STAGE:
      return batch.pageRotator
    case OCR_PROCESSOR_STAGE:
      return batch.ocrProcessor
    case CONTENT_DEDUP_STAGE:
      return batch.contentDedup
    default:
      return null
  }
}

export function getPipelineConfigForBatch(batch: ProcessBatchStatus): PipelineConfig {
  return batch.pipelineConfig ?? INGEST_ONLY_PIPELINE_CONFIG
}

export function getOrchestratedExecutionPlan(batch: ProcessBatchStatus): PipelineExecutionStep[] {
  return getPipelineConfigForBatch(batch)
    .executionPlan.filter((step) => step.enabled && ORCHESTRATED_SERVICES.has(step.service))
    .sort((left, right) => left.order - right.order)
}

export function isExecutionStepCompleted(batch: ProcessBatchStatus, step: PipelineExecutionStep): boolean {
  const stage = getStageForService(batch, step.service)
  if (!stage) {
    return false
  }

  if (step.pass) {
    return stage.completedPasses.includes(step.pass)
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
  const executionPlan = getOrchestratedExecutionPlan(batch)

  for (const step of executionPlan) {
    if (step.service === 'ingester') {
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
  const executionPlan = getOrchestratedExecutionPlan(batch)
  if (executionPlan.length === 0) {
    return false
  }

  const ingesterStep = executionPlan.find((step) => step.service === 'ingester')
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
