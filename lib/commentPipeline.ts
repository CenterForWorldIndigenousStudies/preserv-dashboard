import type { PipelineDiagnosticEvent } from 'types/commentPipeline'

function parseRawValue(rawValue: string | null | undefined): unknown {
  if (!rawValue) return null

  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

function unwrapMetadataValue(value: unknown): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    Object.prototype.hasOwnProperty.call(value, 'value')
  ) {
    return unwrapMetadataValue((value as { value: unknown }).value)
  }

  return value
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function isDiagnosticEvent(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const event = value as Record<string, unknown>
  return (
    typeof event.service === 'string' &&
    typeof event.status === 'string' &&
    typeof event.timestamp === 'string' &&
    typeof event.message === 'string'
  )
}

function timestampValue(timestamp: string): number {
  const parsed = Date.parse(timestamp)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

export function parseCommentPipelineEvents(
  rawValue: string | null | undefined,
  valueType: string | null | undefined,
): PipelineDiagnosticEvent[] {
  if (valueType?.toLowerCase() !== 'json') return []

  const parsed = unwrapMetadataValue(parseRawValue(rawValue))
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return []

  return Object.entries(parsed as Record<string, unknown>)
    .filter(([, value]) => isDiagnosticEvent(value))
    .map(([runKey, value]) => {
      const event = value as Record<string, unknown>
      return {
        runKey,
        service: event.service as string,
        status: event.status as string,
        timestamp: event.timestamp as string,
        message: event.message as string,
        requestId: optionalString(event.request_id),
        batchId: optionalString(event.batch_id),
        documentId: optionalString(event.document_id),
        details: event.details ?? null,
        severity: optionalString(event.severity),
      }
    })
    .sort((left, right) => timestampValue(right.timestamp) - timestampValue(left.timestamp))
}
