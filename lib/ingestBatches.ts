import { db } from '@lib/db'

export interface IngestBatchStatus {
  batchId: string
  batchName: string | null
  requestId: string | null
  startedBy: string | null
  createdAt: string | null
  startedAt: string | null
  completedAt: string | null
  lastTransitionAt: string | null
  status: string | null
  processedCount: number
  ingestedCount: number
  duplicateCount: number
  skippedSameOriginCount: number
  sourceFolderIds: string[]
  collectionName: string | null
  collectionNotes: string | null
  error: string | null
  callbackDeliveryStatus: string | null
  callbackNotifiedAt: string | null
  callbackReceivedAt: string | null
  callbackHttpStatus: number | null
  callbackErrorType: string | null
  callbackErrorMessage: string | null
}

type SelectedBatchFields = {
  id: string
  name: string | null
  started_by: string | null
  created_at: Date | null
  started_at: Date | null
  completed_at: Date | null
  processing_details: string | null
}

interface IngesterProcessingDetails {
  ingester?: {
    status?: string
    request_id?: string | null
    source_folder_ids?: unknown
    collection?: IngesterCollectionDetails | null
    last_transition_at?: string | null
    processed_count?: unknown
    ingested_count?: unknown
    duplicate_count?: unknown
    skipped_same_origin_count?: unknown
    error?: string | null
    callback?: IngesterCallbackDetails | null
  }
}

interface IngesterCollectionDetails {
  name?: string | null
  notes?: string | null
}

interface IngesterCallbackDetails {
  delivery_status?: string | null
  notified_at?: string | null
  received_at?: string | null
  http_status?: unknown
  error_type?: string | null
  error_message?: string | null
}

function parseProcessingDetails(raw: string | null): IngesterProcessingDetails {
  if (!raw?.trim()) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as IngesterProcessingDetails) : {}
  } catch {
    return {}
  }
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []
}

function parseNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function normalizeText(value: string | null | undefined): string | null {
  return value ?? null
}

function toIsoString(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

function parseCollectionFields(
  collection: IngesterCollectionDetails | null | undefined,
): Pick<IngestBatchStatus, 'collectionName' | 'collectionNotes'> {
  return {
    collectionName: collection?.name ?? null,
    collectionNotes: collection?.notes ?? null,
  }
}

function parseCallbackFields(
  callback: IngesterCallbackDetails | null | undefined,
): Pick<
  IngestBatchStatus,
  | 'callbackDeliveryStatus'
  | 'callbackNotifiedAt'
  | 'callbackReceivedAt'
  | 'callbackHttpStatus'
  | 'callbackErrorType'
  | 'callbackErrorMessage'
> {
  return {
    callbackDeliveryStatus: callback?.delivery_status ?? null,
    callbackNotifiedAt: callback?.notified_at ?? null,
    callbackReceivedAt: callback?.received_at ?? null,
    callbackHttpStatus:
      typeof callback?.http_status === 'number' && Number.isFinite(callback.http_status)
        ? callback.http_status
        : null,
    callbackErrorType: callback?.error_type ?? null,
    callbackErrorMessage: callback?.error_message ?? null,
  }
}

function toIngestBatchStatus(batch: SelectedBatchFields): IngestBatchStatus | null {
  const details = parseProcessingDetails(batch.processing_details)
  const ingester = details.ingester
  if (!ingester) {
    return null
  }

  const collectionFields = parseCollectionFields(ingester.collection)
  const callbackFields = parseCallbackFields(ingester.callback)

  return {
    batchId: batch.id,
    batchName: normalizeText(batch.name),
    requestId: normalizeText(ingester.request_id ?? null),
    startedBy: normalizeText(batch.started_by),
    createdAt: toIsoString(batch.created_at),
    startedAt: toIsoString(batch.started_at),
    completedAt: toIsoString(batch.completed_at),
    lastTransitionAt: normalizeText(ingester.last_transition_at ?? null),
    status: normalizeText(ingester.status),
    processedCount: parseNumber(ingester.processed_count),
    ingestedCount: parseNumber(ingester.ingested_count),
    duplicateCount: parseNumber(ingester.duplicate_count),
    skippedSameOriginCount: parseNumber(ingester.skipped_same_origin_count),
    sourceFolderIds: parseStringArray(ingester.source_folder_ids),
    ...collectionFields,
    error: normalizeText(ingester.error),
    ...callbackFields,
  }
}

const ingestBatchSelect = {
  id: true,
  name: true,
  started_by: true,
  created_at: true,
  started_at: true,
  completed_at: true,
  processing_details: true,
} as const

export async function getIngestBatchStatuses(limit = 25): Promise<IngestBatchStatus[]> {
  const batches = await db.batches.findMany({
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit,
    select: ingestBatchSelect,
  })

  return batches.map(toIngestBatchStatus).filter((batch): batch is IngestBatchStatus => batch !== null)
}

export async function getIngestBatchStatus(batchId: string): Promise<IngestBatchStatus | null> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: ingestBatchSelect,
  })

  if (!batch) {
    return null
  }

  return toIngestBatchStatus(batch)
}

export async function markIngestCallbackReceived(batchId: string, receivedAtIso: string): Promise<void> {
  const batch = await db.batches.findUnique({
    where: { id: batchId },
    select: { id: true, processing_details: true },
  })

  if (!batch) {
    throw new Error(`Batch ${batchId} was not found`)
  }

  const details = parseProcessingDetails(batch.processing_details)
  if (!details.ingester) {
    throw new Error(`Batch ${batchId} does not contain ingester processing details`)
  }

  const nextDetails: IngesterProcessingDetails = {
    ...details,
    ingester: {
      ...details.ingester,
      callback: {
        ...(details.ingester.callback ?? {}),
        received_at: receivedAtIso,
      },
    },
  }

  await db.batches.update({
    where: { id: batchId },
    data: {
      processing_details: JSON.stringify(nextDetails),
    },
  })
}
