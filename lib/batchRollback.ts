export interface BatchRollbackResponse {
  id: string
  batch_id: string
  status: string
  requested_by: string | null
  reason: string | null
  last_failure: string | null
}

export async function requestBatchRollback(batchId: string, reason?: string): Promise<BatchRollbackResponse> {
  const response = await fetch(`/api/process/batches/${encodeURIComponent(batchId)}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason?.trim() || undefined }),
  })

  const payload = (await response.json().catch(() => ({}))) as BatchRollbackResponse & {
    error?: string
    detail?: string
  }
  if (!response.ok) {
    throw new Error(payload.error ?? payload.detail ?? `Rollback request failed (${response.status})`)
  }
  return payload
}

export async function retryBatchRollback(batchId: string): Promise<BatchRollbackResponse> {
  const response = await fetch(`/api/process/batches/${encodeURIComponent(batchId)}/rollback/retry`, {
    method: 'POST',
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => ({}))) as BatchRollbackResponse & {
    error?: string
    detail?: string
  }
  if (!response.ok) {
    throw new Error(payload.error ?? payload.detail ?? `Rollback retry failed (${response.status})`)
  }
  return payload
}
