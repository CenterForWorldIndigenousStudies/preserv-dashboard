export type LibraryRemovalStatus = 'requested' | 'in_progress' | 'needs_attention' | 'failed' | 'completed'

export interface LibraryRemovalItem {
  id: string
  document_id: string
  publication_document_id: string
  source_candidate_document_id: string
  status: LibraryRemovalStatus
  fedora_delete_status: string
  drive_quarantine_status: string
  restoration_status: string
  error_type: string | null
  error_message: string | null
  retryable: boolean
  requested_at: string | null
  started_at: string | null
  completed_at: string | null
}

export interface LibraryRemovalRequest {
  id: string
  status: LibraryRemovalStatus
  requested_by: string
  requested_at: string | null
  started_at: string | null
  completed_at: string | null
  last_failure: string | null
  items: LibraryRemovalItem[]
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string; detail?: string }
  if (!response.ok) {
    throw new Error(body.error ?? body.detail ?? `Library removal request failed (${response.status}).`)
  }
  return body
}

export async function requestLibraryRemoval(documentIds: string[]): Promise<LibraryRemovalRequest> {
  return readResponse<LibraryRemovalRequest>(
    await fetch('/api/library/removals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds }),
    }),
  )
}

export async function getLibraryRemoval(requestId: string): Promise<LibraryRemovalRequest> {
  return readResponse<LibraryRemovalRequest>(
    await fetch(`/api/library/removals/${encodeURIComponent(requestId)}`, { cache: 'no-store' }),
  )
}

export async function retryLibraryRemovalItem(requestId: string, itemId: string): Promise<LibraryRemovalItem> {
  return readResponse<LibraryRemovalItem>(
    await fetch(`/api/library/removals/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/retry`, {
      method: 'POST',
    }),
  )
}
