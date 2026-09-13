export interface PipelineDiagnosticEvent {
  runKey: string
  service: string
  status: string
  timestamp: string
  message: string
  requestId: string | null
  batchId: string | null
  documentId: string | null
  details: unknown
  severity: string | null
}

export interface PipelineEventBatchLink {
  name: string
  href: string
}
