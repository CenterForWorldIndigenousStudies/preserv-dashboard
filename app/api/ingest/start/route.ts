import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

import { BASE_URL } from '@constants/server'
import { auth } from '@root/auth'
import { logEvent } from '@lib/observability'

interface IngestStartRequestBody {
  batchName?: unknown
  sourceFolderIds?: unknown
  collectionName?: unknown
  collectionNotes?: unknown
}

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeSourceFolderIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  const startedBy = session?.user?.email?.trim()
  if (!startedBy) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const ingesterBaseUrl = process.env.DATA_INGESTER_BASE_URL?.trim()
  const triggerToken = process.env.DATA_INGESTER_TRIGGER_TOKEN?.trim()
  const callbackToken = process.env.INGESTER_CALLBACK_TOKEN?.trim()
  if (!ingesterBaseUrl) {
    return NextResponse.json({ error: 'DATA_INGESTER_BASE_URL is not configured.' }, { status: 500 })
  }
  if (!triggerToken) {
    return NextResponse.json({ error: 'DATA_INGESTER_TRIGGER_TOKEN is not configured.' }, { status: 500 })
  }
  if (!callbackToken) {
    return NextResponse.json({ error: 'INGESTER_CALLBACK_TOKEN is not configured.' }, { status: 500 })
  }

  let body: IngestStartRequestBody
  try {
    body = (await request.json()) as IngestStartRequestBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const batchName = normalizeText(body.batchName)
  const sourceFolderIds = normalizeSourceFolderIds(body.sourceFolderIds)
  const collectionName = normalizeText(body.collectionName)
  const collectionNotes = normalizeText(body.collectionNotes)

  if (!batchName) {
    return NextResponse.json({ error: 'batchName is required.' }, { status: 400 })
  }
  if (sourceFolderIds.length === 0) {
    return NextResponse.json({ error: 'At least one source folder must be selected.' }, { status: 400 })
  }

  const callbackUrl = new URL('/api/ingest/callback', BASE_URL).toString()
  const requestId = randomUUID()
  const collection = collectionName
    ? {
        name: collectionName,
        notes: collectionNotes,
      }
    : null

  const ingestPayload = {
    app: 'preserv-dashboard',
    request_id: requestId,
    batch_name: batchName,
    started_by: startedBy,
    initiated_at: new Date().toISOString(),
    source_folder_ids: sourceFolderIds,
    collection,
    callback: {
      url: callbackUrl,
      token: callbackToken,
    },
  }
  logEvent('info', 'ingest_trigger_requested', {
    requestId,
    app: ingestPayload.app,
    batchName,
    startedBy,
    sourceFolderIds,
    callbackUrl,
  })

  try {
    const response = await fetch(new URL('/ingest', ingesterBaseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${triggerToken}`,
      },
      body: JSON.stringify(ingestPayload),
      cache: 'no-store',
    })
    const payload = (await response.json()) as object
    logEvent(response.ok ? 'info' : 'error', response.ok ? 'ingest_trigger_accepted' : 'ingest_trigger_failed', {
      requestId,
      batchName,
      startedBy,
      ingesterBaseUrl,
      statusCode: response.status,
    })
    return NextResponse.json(payload, { status: response.status })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to contact data-ingester.'
    logEvent('error', 'ingest_trigger_failed', {
      requestId,
      batchName,
      startedBy,
      ingesterBaseUrl,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
