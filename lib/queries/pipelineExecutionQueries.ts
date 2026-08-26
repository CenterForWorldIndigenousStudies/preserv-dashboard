import { db } from '@lib/db'
import { buildNameHash } from '@lib/tagHash'
import { getProcessBatchStatus } from '@lib/processBatches'
import type {
  PipelineExecutionSnapshot,
  PipelineQueueAttemptSummary,
} from 'types/pipelineExecution'

function parseJsonRecord(value: string | null): Record<string, unknown> {
  if (!value?.trim()) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function textValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function mapQueueAttempt(item: {
  id: string
  stage: string
  status: string
  queued_at: Date
  completed_at: Date | null
  error_type: string | null
  error_message: string | null
  payload: string
}): PipelineQueueAttemptSummary {
  const payload = parseJsonRecord(item.payload)
  return {
    id: item.id,
    stage: item.stage,
    status: item.status,
    queuedAt: item.queued_at.toISOString(),
    completedAt: item.completed_at?.toISOString() ?? null,
    errorType: item.error_type,
    errorMessage: item.error_message,
    operationId: textValue(payload.operation_id),
    executionMode: textValue(payload.execution_mode),
  }
}

export async function batchNameExists(name: string, excludeBatchId?: string): Promise<boolean> {
  const nameHash = buildNameHash(name.trim())
  const match = await db.batches.findFirst({
    where: {
      OR: [{ name_hash: nameHash }, { name: name.trim() }],
      ...(excludeBatchId ? { id: { not: excludeBatchId } } : {}),
    },
    select: { id: true },
  })
  return match !== null
}

export async function documentIdsExist(documentIds: string[]): Promise<boolean> {
  const normalizedIds = [...new Set(documentIds.map((id) => id.trim()).filter(Boolean))]
  if (normalizedIds.length === 0) {
    return false
  }

  const count = await db.documents.count({ where: { id: { in: normalizedIds } } })
  return count === normalizedIds.length
}

export async function getPipelineExecutionSnapshot(
  batchId: string,
  newBatchName?: string,
): Promise<PipelineExecutionSnapshot> {
  const [batch, queueItems, batchNameConflict] = await Promise.all([
    getProcessBatchStatus(batchId),
    db.pipeline_queue_items.findMany({
      where: { batch_id: batchId },
      orderBy: [{ queued_at: 'desc' }, { id: 'desc' }],
      take: 100,
      select: {
        id: true,
        stage: true,
        status: true,
        queued_at: true,
        completed_at: true,
        error_type: true,
        error_message: true,
        payload: true,
      },
    }),
    newBatchName ? batchNameExists(newBatchName) : Promise.resolve(false),
  ])

  const currentExecution = batch?.currentExecution ?? null

  return {
    batch,
    currentExecution,
    queueAttempts: queueItems.map(mapQueueAttempt),
    batchNameConflict,
  }
}
