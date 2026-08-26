import {
  PIPELINE_EXECUTION_MODES,
  type PipelineExecutionMode,
} from '@constants/pipelineExecutionModes'
import type { PipelineConfig } from '@lib/pipelineConfig'

export interface PipelineExecutionContext {
  executionMode: PipelineExecutionMode
  operationId: string
  idempotencyKey: string
  reason?: string
  sourceDocumentIds?: string[]
  sourceBatchId?: string
  newBatchName?: string
  pipelineConfig?: PipelineConfig
}

export type PipelineExecutionContextInput = Partial<PipelineExecutionContext>

function normalizeOptionalText(value: string | undefined, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${fieldName} cannot be blank.`)
  }

  return normalized
}

function normalizeDocumentIds(values: string[] | undefined): string[] {
  if (!values) {
    return []
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function normalizePipelineExecutionContext(
  requestId: string,
  input: PipelineExecutionContextInput = {},
): PipelineExecutionContext {
  const normalizedRequestId = requestId.trim()
  if (!normalizedRequestId) {
    throw new Error('requestId cannot be blank.')
  }

  const executionMode = input.executionMode ?? PIPELINE_EXECUTION_MODES.NORMAL
  const fallbackIdentifier = executionMode === PIPELINE_EXECUTION_MODES.NORMAL ? normalizedRequestId : undefined
  const operationId = normalizeOptionalText(input.operationId, 'operationId') ?? fallbackIdentifier
  const idempotencyKey = normalizeOptionalText(input.idempotencyKey, 'idempotencyKey') ?? fallbackIdentifier
  const reason = normalizeOptionalText(input.reason, 'reason')
  const sourceDocumentIds = normalizeDocumentIds(input.sourceDocumentIds)
  const sourceBatchId = normalizeOptionalText(input.sourceBatchId, 'sourceBatchId')
  const newBatchName = normalizeOptionalText(input.newBatchName, 'newBatchName')

  if (!operationId) {
    throw new Error(`${executionMode} execution requires operationId.`)
  }
  if (!idempotencyKey) {
    throw new Error(`${executionMode} execution requires idempotencyKey.`)
  }
  if (executionMode === PIPELINE_EXECUTION_MODES.REPROCESS) {
    if (sourceDocumentIds.length === 0) {
      throw new Error('reprocess execution requires sourceDocumentIds.')
    }
    if (!newBatchName) {
      throw new Error('reprocess execution requires newBatchName.')
    }
  } else if (newBatchName) {
    throw new Error(`${executionMode} execution cannot specify newBatchName.`)
  }
  if (
    input.pipelineConfig &&
    executionMode !== PIPELINE_EXECUTION_MODES.NORMAL &&
    executionMode !== PIPELINE_EXECUTION_MODES.RERUN
  ) {
    throw new Error(`${executionMode} execution cannot specify pipelineConfig.`)
  }

  return {
    executionMode,
    operationId,
    idempotencyKey,
    ...(reason ? { reason } : {}),
    sourceDocumentIds,
    ...(sourceBatchId ? { sourceBatchId } : {}),
    ...(newBatchName ? { newBatchName } : {}),
    ...(input.pipelineConfig ? { pipelineConfig: input.pipelineConfig } : {}),
  }
}
