import { NextRequest, NextResponse } from 'next/server'

import { logEvent } from '@lib/observability'
import { parseBearerToken } from '@lib/pipelineCallbacks'
import { getProcessBatchStatus } from '@lib/processBatches'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

const TERMINAL_ROLLBACK_STATUSES = new Set(['failed', 'rolled_back'])

interface RollbackCallbackBody {
  batch_id?: unknown
  rollback_id?: unknown
  status?: unknown
  completed_at?: unknown
  restored_count?: unknown
  deleted_count?: unknown
  cancelled_count?: unknown
  conflict_count?: unknown
  failed_count?: unknown
  last_failure?: unknown
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.PIPELINE_CALLBACK_TOKEN?.trim()
  if (!expectedToken || parseBearerToken(request.headers.get('authorization')) !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized callback.' }, { status: 401 })
  }

  let body: RollbackCallbackBody
  try {
    body = (await request.json()) as RollbackCallbackBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const batchId = text(body.batch_id)
  const rollbackId = text(body.rollback_id)
  const status = text(body.status)
  if (!batchId || !rollbackId || !TERMINAL_ROLLBACK_STATUSES.has(status)) {
    return NextResponse.json(
      { error: 'batch_id, rollback_id, and a terminal rollback status are required.' },
      { status: 400 },
    )
  }

  const batch = await getProcessBatchStatus(batchId)
  if (!batch) {
    return NextResponse.json({ error: `Batch ${batchId} was not found.` }, { status: 404 })
  }

  logEvent('info', 'batch_rollback_callback_received', {
    batchId,
    rollbackId,
    status,
    lifecycleStatus: batch.lifecycleStatus,
    rollbackStatus: batch.rollbackStatus,
    completedAt: text(body.completed_at) || null,
    restoredCount: number(body.restored_count),
    deletedCount: number(body.deleted_count),
    cancelledCount: number(body.cancelled_count),
    conflictCount: number(body.conflict_count),
    failedCount: number(body.failed_count),
    lastFailure: text(body.last_failure) || null,
  })
  return new NextResponse(null, { status: 204 })
}
