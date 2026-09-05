import {
  PIPELINE_EXECUTION_MODES,
  type PipelineExecutionMode,
} from '@constants/pipelineExecutionModes'
import type { PipelineConfig } from '@lib/pipelineConfig'

export interface PipelineExecutionCollection {
  name: string
  notes: string | null
}

export interface PipelineExecutionContext {
  executionMode: PipelineExecutionMode
  operationId: string
  idempotencyKey: string
  reason?: string
  sourceDocumentIds?: string[]
  sourceBatchId?: string
  newBatchName?: string
  draftBatchId?: string
  collection?: PipelineExecutionCollection
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

function normalizeCollection(value: PipelineExecutionCollection | undefined): PipelineExecutionCollection | undefined {
  if (!value) return undefined

  const name = normalizeOptionalText(value.name, 'collection.name')
  if (!name) return undefined
  const notes = value.notes === null ? null : normalizeOptionalText(value.notes, 'collection.notes') ?? null
  return { name, notes }
}

function validateExecutionScope(
  executionMode: PipelineExecutionMode,
  sourceDocumentIds: string[],
  newBatchName: string | undefined,
  draftBatchId: string | undefined,
): void {
  if (executionMode === PIPELINE_EXECUTION_MODES.REPROCESS) {
    if (draftBatchId) {
      if (newBatchName) {
        throw new Error('draft reprocess execution cannot specify newBatchName.')
      }
      return
    }
    if (sourceDocumentIds.length === 0) {
      throw new Error('reprocess execution requires sourceDocumentIds.')
    }
    if (!newBatchName) {
      throw new Error('reprocess execution requires newBatchName.')
    }
    return
  }

  if (newBatchName) {
    throw new Error(`${executionMode} execution cannot specify newBatchName.`)
  }
  if (draftBatchId) {
    throw new Error(`${executionMode} execution cannot specify draftBatchId.`)
  }
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
  const draftBatchId = normalizeOptionalText(input.draftBatchId, 'draftBatchId')
  const collection = normalizeCollection(input.collection)

  if (!operationId) {
    throw new Error(`${executionMode} execution requires operationId.`)
  }
  if (!idempotencyKey) {
    throw new Error(`${executionMode} execution requires idempotencyKey.`)
  }
  validateExecutionScope(executionMode, sourceDocumentIds, newBatchName, draftBatchId)
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
    ...(draftBatchId ? { draftBatchId } : {}),
    ...(collection ? { collection } : {}),
    ...(input.pipelineConfig ? { pipelineConfig: input.pipelineConfig } : {}),
  }
}
