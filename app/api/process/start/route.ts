import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

import { DATA_INGESTER_CALLBACK_PATH } from '@constants/paths'
import { DASHBOARD_BASE_URL } from '@constants/server'
import { getDashboardSession } from '@root/auth'
import { logEvent } from '@lib/observability'
import { parsePipelineConfig, pipelineConfigToRequestedStages, type PipelineConfig } from '@lib/pipelineConfig'
import { setProcessBatchPipelineConfig } from '@lib/processBatches'

interface ProcessStartRequestBody {
  batchName?: unknown
  sourceFolderIds?: unknown
  collectionName?: unknown
  collectionNotes?: unknown
  pipelineConfig?: unknown
}

interface IngesterAcceptedResponse {
  batch_id?: unknown
  batch_name?: unknown
  error?: unknown
  detail?: unknown
}

interface IngesterTriggerConfig {
  ingesterBaseUrl: string
  triggerToken: string
  callbackToken: string
}

interface ValidatedProcessStartInput {
  batchName: string
  sourceFolderIds: string[]
  collectionName: string | null
  collectionNotes: string | null
  pipelineConfig: PipelineConfig
  requestedStages: string[]
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
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length > 0)
}

function buildRequestedStagesFromConfig(config: PipelineConfig): string[] {
  // Use the helper to convert config to legacy requestedStages format
  return pipelineConfigToRequestedStages(config)
}

async function parseProcessStartRequestBody(request: NextRequest): Promise<ProcessStartRequestBody | NextResponse> {
  try {
    return (await request.json()) as ProcessStartRequestBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
}

async function persistRequestedStages(batchId: string, pipelineConfig: PipelineConfig): Promise<void> {
  await setProcessBatchPipelineConfig(batchId, pipelineConfig)
}

function validateProcessStartInput(body: ProcessStartRequestBody): ValidatedProcessStartInput | NextResponse {
  const batchName = normalizeText(body.batchName)
  const sourceFolderIds = normalizeSourceFolderIds(body.sourceFolderIds)
  const collectionName = normalizeText(body.collectionName)
  const collectionNotes = normalizeText(body.collectionNotes)
  const pipelineConfig = parsePipelineConfig(body.pipelineConfig)
  const requestedStages = pipelineConfig ? buildRequestedStagesFromConfig(pipelineConfig) : []

  if (!batchName) {
    return NextResponse.json({ error: 'batchName is required.' }, { status: 400 })
  }
  if (sourceFolderIds.length === 0) {
    return NextResponse.json({ error: 'At least one source folder must be selected.' }, { status: 400 })
  }
  if (!pipelineConfig) {
    return NextResponse.json({ error: 'pipelineConfig is required.' }, { status: 400 })
  }

  return {
    batchName,
    sourceFolderIds,
    collectionName,
    collectionNotes,
    pipelineConfig,
    requestedStages,
  }
}

function requireIngesterTriggerConfig(): IngesterTriggerConfig {
  const ingesterBaseUrl = process.env.DATA_INGESTER_BASE_URL?.trim()
  const triggerToken = process.env.DATA_INGESTER_TRIGGER_TOKEN?.trim()
  const callbackToken = process.env.DATA_INGESTER_CALLBACK_TOKEN?.trim()

  if (!ingesterBaseUrl) {
    throw new Error('DATA_INGESTER_BASE_URL is not configured.')
  }
  if (!triggerToken) {
    throw new Error('DATA_INGESTER_TRIGGER_TOKEN is not configured.')
  }
  if (!callbackToken) {
    throw new Error('DATA_INGESTER_CALLBACK_TOKEN is not configured.')
  }

  return { ingesterBaseUrl, triggerToken, callbackToken }
}

function normalizeIngesterErrorMessage(payload: IngesterAcceptedResponse): string | null {
  if (typeof payload.error === 'string') {
    const normalized = payload.error.trim()
    if (normalized) {
      return normalized
    }
  }

  if (typeof payload.detail === 'string') {
    const normalized = payload.detail.trim()
    if (normalized) {
      return normalized
    }
  }

  return null
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getDashboardSession()
  const startedBy = session?.user?.email?.trim()
  if (!startedBy) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  let triggerConfig: IngesterTriggerConfig
  try {
    triggerConfig = requireIngesterTriggerConfig()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Process trigger configuration is invalid.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const parsedBody = await parseProcessStartRequestBody(request)
  if (parsedBody instanceof NextResponse) {
    return parsedBody
  }

  const validatedInput = validateProcessStartInput(parsedBody)
  if (validatedInput instanceof NextResponse) {
    return validatedInput
  }

  const {
    batchName,
    sourceFolderIds,
    collectionName,
    collectionNotes,
    pipelineConfig,
    requestedStages,
  } = validatedInput

  const callbackUrl = new URL(DATA_INGESTER_CALLBACK_PATH, DASHBOARD_BASE_URL).toString()
  const requestId = randomUUID()
  const collection = collectionName ? { name: collectionName, notes: collectionNotes } : null

  const ingestPayload = {
    app: 'preserv-dashboard',
    request_id: requestId,
    batch_name: batchName,
    started_by: startedBy,
    initiated_at: new Date().toISOString(),
    source_folder_ids: sourceFolderIds,
    requested_stages: requestedStages,
    pipeline_config: pipelineConfig,
    collection,
    callback: {
      url: callbackUrl,
      token: triggerConfig.callbackToken,
    },
  }

  logEvent('info', 'process_start_requested', {
    requestId,
    batchName,
    startedBy,
    sourceFolderIds,
    requestedStages,
    hasPipelineConfig: !!pipelineConfig,
    pipelineConfigProfile: pipelineConfig?.profileId ?? null,
  })

  try {
    const response = await fetch(new URL('/ingest', triggerConfig.ingesterBaseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${triggerConfig.triggerToken}`,
      },
      body: JSON.stringify(ingestPayload),
      cache: 'no-store',
    })
    const payload = (await response.json()) as IngesterAcceptedResponse
    if (!response.ok) {
      const errorMessage = normalizeIngesterErrorMessage(payload)
      logEvent('error', 'ingester_trigger_failed', {
        requestId,
        batchName,
        startedBy,
        ingesterBaseUrl: triggerConfig.ingesterBaseUrl,
        statusCode: response.status,
        errorMessage,
      })
      return NextResponse.json(
        errorMessage ? { ...payload, error: errorMessage } : payload,
        { status: response.status },
      )
    }

    const batchId = typeof payload.batch_id === 'string' ? payload.batch_id.trim() : ''
    if (!batchId) {
      throw new Error('data-ingester response did not include batch_id.')
    }

    await persistRequestedStages(batchId, pipelineConfig)

    logEvent('info', 'ingester_trigger_accepted', {
      requestId,
      batchId,
      batchName,
      startedBy,
      ingesterBaseUrl: triggerConfig.ingesterBaseUrl,
      requestedStages,
      statusCode: response.status,
    })

    return NextResponse.json(payload, { status: response.status })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start process.'
    logEvent('error', 'process_start_failed', {
      requestId,
      batchName,
      startedBy,
      ingesterBaseUrl: triggerConfig.ingesterBaseUrl,
      errorMessage: message,
    })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
