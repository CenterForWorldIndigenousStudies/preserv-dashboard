import type { PipelineCallbackBody } from 'types/pipelineContracts'

export interface ParsedPipelineCallbackBody {
  batchId: string
  requestId: string
  status: string
  errorMessage: string
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
  }
}
