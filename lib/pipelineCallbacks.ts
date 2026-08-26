import type { PipelineCallbackBody } from 'types/pipelineContracts'

export interface ParsedPipelineCallbackBody {
  batchId: string
  requestId: string
  status: string
  errorMessage: string
  operationId: string
  idempotencyKey: string
  executionMode: string
  queueItemId: string
  stage: string
}

export function parseBearerToken(authorization: string | null): string {
  return (authorization ?? '').replace(/^Bearer\s+/i, '').trim()
}

export function parsePipelineCallbackBody(body: PipelineCallbackBody): ParsedPipelineCallbackBody {
  return {
    batchId: typeof body.batch_id === 'string' ? body.batch_id.trim() : '',
    requestId: typeof body.request_id === 'string' ? body.request_id.trim() : '',
    status: typeof body.status === 'string' ? body.status.trim() : '',
    errorMessage: typeof body.error === 'string' ? body.error.trim() : '',
    operationId: typeof body.operation_id === 'string' ? body.operation_id.trim() : '',
    idempotencyKey: typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : '',
    executionMode: typeof body.execution_mode === 'string' ? body.execution_mode.trim() : '',
    queueItemId: typeof body.queue_item_id === 'string' ? body.queue_item_id.trim() : '',
    stage: typeof body.stage === 'string' ? body.stage.trim() : '',
  }
}
