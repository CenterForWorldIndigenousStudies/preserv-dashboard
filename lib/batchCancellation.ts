export interface BatchCancellationResponse {
  batch_id: string
  lifecycle_status: 'cancelled'
  cancelled_count: number
}

export async function cancelBatch(batchId: string): Promise<BatchCancellationResponse> {
  const response = await fetch(`/api/process/batches/${encodeURIComponent(batchId)}/cancel`, {
    method: 'POST',
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as BatchCancellationResponse & {
    error?: string
    detail?: string
  }
  if (!response.ok) {
    throw new Error(payload.error ?? payload.detail ?? `Batch cancellation failed (${response.status})`)
  }
  return payload
}
