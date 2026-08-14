import { DOCUMENT_STATES } from '@constants/documentStates'
import {
  NEEDS_REVIEW_HISTORY_METADATA_NAME,
  NEEDS_REVIEW_HISTORY_METADATA_NOTES,
  NEEDS_REVIEW_METADATA_NAME,
} from '@constants/documentMetadata'
import { db } from '@lib/db'
import { normalizeNeedsReviewValue } from '@lib/needsReview'
import { appendReviewHistoryEpisode } from '@lib/reviewHistory'
import {
  evaluateCandidateReadiness,
  projectCandidateMetadata,
  type ReadinessReasonGroup,
} from '@lib/readiness'
import type { Prisma, PrismaClient } from '@lib/prisma/generated/client'

type ReadinessDbClient = PrismaClient | Prisma.TransactionClient

const READINESS_SERVICE_KEY = 'readiness'
const RIGHTS_CONFIDENCE_THRESHOLD = 0.7

interface StoredMetadataRow {
  document_id: string
  value: string | null
  value_type: string | null
  metadata: { name: string }
}

interface BatchLinkRow {
  document_id: string
  processing_details: string
}

interface CandidateReadinessDocument {
  id: string
  metadata: Record<string, unknown>
  activeReviewValue: unknown
  accessLevels: string[]
  latestState: { id: string; new_state: string | null } | null
  quality: { validation_status: string | null } | null
  validatedFields: Record<string, unknown>
}

export async function finalizePipelineBatchReadiness(
  batchId: string,
  client: ReadinessDbClient = db,
): Promise<void> {
  await client.$transaction(async (tx) => {
    const documents = await loadCandidateReadinessDocuments(tx, batchId)
    await Promise.all(documents.map((document) => finalizeCandidateReadiness(tx, document)))
  })
}

export async function evaluateDocumentReadiness(
  documentId: string,
  client: ReadinessDbClient = db,
): Promise<{
  isPreservationCandidate: boolean
  evaluation: ReturnType<typeof evaluateCandidateReadiness>
}> {
  const [metadataRows, accessRows, links] = await Promise.all([
    client.document_to_metadata.findMany({
      where: { document_id: documentId },
      select: { value: true, metadata: { select: { name: true } } },
    }),
    client.document_access.findMany({
      where: { document_id: documentId },
      select: { access_levels: { select: { level_name: true } } },
    }),
    client.document_to_batches.findMany({
      where: { document_id: documentId },
      select: { document_id: true, processing_details: true },
    }),
  ])
  const metadata: Record<string, unknown> = {}
  for (const row of metadataRows) {
    metadata[row.metadata.name] = parseStoredMetadataValue(row.value)
  }
  const validatedFields = buildValidatedFields(links)
  const projectedMetadata = projectCandidateMetadata({ metadata, validatedFields })
  return {
    isPreservationCandidate: metadata.preservation_candidate === true,
    evaluation: evaluateCandidateReadiness({
      metadata: projectedMetadata,
      validatedFields,
      accessLevels: accessRows.map((row) => row.access_levels.level_name),
    }),
  }
}

async function loadCandidateReadinessDocuments(
  client: Prisma.TransactionClient,
  batchId: string,
): Promise<CandidateReadinessDocument[]> {
  const links = (await client.document_to_batches.findMany({
    where: { batch_id: batchId },
    select: { document_id: true, processing_details: true },
  })) as BatchLinkRow[]
  const documentIds = [...new Set(links.map((link) => link.document_id))]
  if (documentIds.length === 0) return []

  const [metadataRows, accessRows, qualityRows, stateRows] = await Promise.all([
    client.document_to_metadata.findMany({
      where: { document_id: { in: documentIds } },
      select: { document_id: true, value: true, value_type: true, metadata: { select: { name: true } } },
    }),
    client.document_access.findMany({
      where: { document_id: { in: documentIds } },
      select: { document_id: true, access_levels: { select: { level_name: true } } },
    }),
    client.document_quality.findMany({
      where: { document_id: { in: documentIds } },
      select: { document_id: true, validation_status: true },
    }),
    client.state_history.findMany({
      where: { document_id: { in: documentIds } },
      select: { id: true, document_id: true, new_state: true, changed_at: true },
      orderBy: [{ changed_at: 'desc' }, { id: 'desc' }],
    }),
  ])

  const metadataByDocumentId = new Map<string, StoredMetadataRow[]>()
  for (const row of metadataRows) {
    const rows = metadataByDocumentId.get(row.document_id) ?? []
    rows.push(row)
    metadataByDocumentId.set(row.document_id, rows)
  }

  const accessByDocumentId = new Map<string, string[]>()
  for (const row of accessRows) {
    const levels = accessByDocumentId.get(row.document_id) ?? []
    levels.push(row.access_levels.level_name)
    accessByDocumentId.set(row.document_id, levels)
  }

  const qualityByDocumentId = new Map(qualityRows.map((row) => [row.document_id, row]))
  const latestStateByDocumentId = new Map<string, (typeof stateRows)[number]>()
  for (const row of stateRows) {
    if (!latestStateByDocumentId.has(row.document_id)) {
      latestStateByDocumentId.set(row.document_id, row)
    }
  }

  return documentIds.flatMap((documentId) => {
    const rows = metadataByDocumentId.get(documentId) ?? []
    const metadata: Record<string, unknown> = {}
    let activeReviewValue: unknown
    for (const row of rows) {
      const value = parseStoredMetadataValue(row.value)
      metadata[row.metadata.name] = value
      if (row.metadata.name === NEEDS_REVIEW_METADATA_NAME) {
        activeReviewValue = value
      }
    }

    if (metadata.preservation_candidate !== true) return []

    return [
      {
        id: documentId,
        metadata,
        activeReviewValue,
        accessLevels: accessByDocumentId.get(documentId) ?? [],
        latestState: latestStateByDocumentId.get(documentId) ?? null,
        quality: qualityByDocumentId.get(documentId) ?? null,
        validatedFields: buildValidatedFields(
          links.filter((link) => link.document_id === documentId),
        ),
      },
    ]
  })
}

function buildValidatedFields(links: BatchLinkRow[]): Record<string, unknown> {
  const validatedFields: Record<string, unknown> = {}
  for (const link of links) {
    const details = parseJsonRecord(link.processing_details)
    const metadataValidator = parseJsonRecord(details.metadata_validator)
    const lowConfidenceFields = Array.isArray(metadataValidator.low_confidence_fields)
      ? metadataValidator.low_confidence_fields
          .filter((field): field is string => typeof field === 'string')
          .map((field) => field.trim())
          .filter(Boolean)
      : []
    for (const field of lowConfidenceFields) {
      validatedFields[field] = false
    }

    const rightsDeterminator = parseJsonRecord(details.rights_determinator)
    if (typeof rightsDeterminator.confidence === 'number') {
      validatedFields.dc_rights = rightsDeterminator.confidence >= RIGHTS_CONFIDENCE_THRESHOLD
    }
  }
  return validatedFields
}

async function finalizeCandidateReadiness(
  client: Prisma.TransactionClient,
  document: CandidateReadinessDocument,
): Promise<void> {
  if (document.latestState?.new_state === DOCUMENT_STATES.INGESTED_FEDORA) return
  if (document.latestState?.new_state === DOCUMENT_STATES.REJECTED) return

  const projectedMetadata = projectCandidateMetadata({
    metadata: document.metadata,
    validatedFields: document.validatedFields,
  })
  const evaluation = evaluateCandidateReadiness({
    metadata: projectedMetadata,
    validatedFields: document.validatedFields,
    accessLevels: document.accessLevels,
  })
  const activeReasons = mergeActiveReasons(document.activeReviewValue, evaluation.reasonGroups)
  const targetState = activeReasons ? DOCUMENT_STATES.NEEDS_REVIEW : DOCUMENT_STATES.APPROVED

  if (projectedMetadata.dc_subject !== undefined) {
    await upsertMetadataValue(client, document.id, 'dc_subject', projectedMetadata.dc_subject)
  }

  if (activeReasons) {
    await upsertMetadataValue(client, document.id, NEEDS_REVIEW_METADATA_NAME, activeReasons)
  } else {
    await archiveAndRemoveActiveReasons(client, document)
  }

  const stateHistoryId = await ensureLatestState(client, document, targetState)
  await client.document_quality.upsert({
    where: { document_id: document.id },
    create: {
      id: crypto.randomUUID(),
      document_id: document.id,
      current_status: stateHistoryId,
      validation_status: targetState === DOCUMENT_STATES.APPROVED ? 'APPROVED' : 'NEEDS_REVIEW',
      validation_timestamp: Math.floor(Date.now() / 1000),
    },
    update: {
      current_status: stateHistoryId,
      validation_status: targetState === DOCUMENT_STATES.APPROVED ? 'APPROVED' : 'NEEDS_REVIEW',
      validation_timestamp: Math.floor(Date.now() / 1000),
    },
  })
}

async function ensureLatestState(
  client: Prisma.TransactionClient,
  document: CandidateReadinessDocument,
  targetState: string,
): Promise<string> {
  if (document.latestState?.new_state === targetState) return document.latestState.id

  const state = await client.state_history.create({
    data: {
      id: crypto.randomUUID(),
      document_id: document.id,
      previous_state: document.latestState?.new_state ?? null,
      new_state: targetState,
      changed_at: new Date(),
    },
    select: { id: true },
  })
  return state.id
}

function mergeActiveReasons(value: unknown, readinessGroups: ReadinessReasonGroup[]): string | null {
  const groups = normalizeNeedsReviewValue(value).filter((group) => group.serviceKey !== READINESS_SERVICE_KEY)
  const mergedGroups = [...groups, ...readinessGroups]
  if (mergedGroups.length === 0) return null

  const payload: Record<string, string[]> = {}
  for (const group of mergedGroups) {
    payload[group.serviceKey] = [...(payload[group.serviceKey] ?? []), ...group.reasons]
  }
  return JSON.stringify(payload)
}

async function archiveAndRemoveActiveReasons(
  client: Prisma.TransactionClient,
  document: CandidateReadinessDocument,
): Promise<void> {
  if (document.activeReviewValue === undefined) return

  const activeReasons = normalizeNeedsReviewValue(document.activeReviewValue)
  if (activeReasons.length > 0) {
    const historyDefinition = await ensureMetadataDefinition(
      client,
      NEEDS_REVIEW_HISTORY_METADATA_NAME,
      NEEDS_REVIEW_HISTORY_METADATA_NOTES,
    )
    const existingHistory = await client.document_to_metadata.findFirst({
      where: { document_id: document.id, metadata_id: historyDefinition.id },
      select: { id: true, metadata_id: true, value: true },
    })
    const historyValue = appendReviewHistoryEpisode(existingHistory?.value, {
      episode_id: crypto.randomUUID(),
      resolved_at: new Date().toISOString(),
      resolved_by: null,
      decision: 'APPROVED',
      validation_status_before: document.quality?.validation_status ?? null,
      reasons: activeReasons,
      source: 'pipeline_readiness',
      inferred: true,
    })
    await client.document_to_metadata.upsert({
      where: {
        document_id_metadata_id: { document_id: document.id, metadata_id: historyDefinition.id },
      },
      create: {
        id: crypto.randomUUID(),
        document_id: document.id,
        metadata_id: historyDefinition.id,
        value: JSON.stringify(historyValue),
        value_type: 'json',
      },
      update: { value: JSON.stringify(historyValue), value_type: 'json' },
    })
  }

  const activeMetadata = await client.document_to_metadata.findFirst({
    where: { document_id: document.id, metadata: { name: NEEDS_REVIEW_METADATA_NAME } },
    select: { id: true },
  })
  if (activeMetadata) {
    await client.document_to_metadata.delete({ where: { id: activeMetadata.id } })
  }
}

async function upsertMetadataValue(
  client: Prisma.TransactionClient,
  documentId: string,
  name: string,
  value: unknown,
): Promise<void> {
  const definition = await ensureMetadataDefinition(client, name)
  await client.document_to_metadata.upsert({
    where: { document_id_metadata_id: { document_id: documentId, metadata_id: definition.id } },
    create: {
      id: crypto.randomUUID(),
      document_id: documentId,
      metadata_id: definition.id,
      value: JSON.stringify({ value }),
      value_type: typeof value === 'string' ? 'string' : 'json',
    },
    update: {
      value: JSON.stringify({ value }),
      value_type: typeof value === 'string' ? 'string' : 'json',
    },
  })
}

async function ensureMetadataDefinition(
  client: Prisma.TransactionClient,
  name: string,
  notes?: string,
): Promise<{ id: string }> {
  const existing = await client.metadata.findFirst({ where: { name }, select: { id: true } })
  if (existing) return existing

  return client.metadata.create({
    data: { id: crypto.randomUUID(), name, notes: notes ?? null },
    select: { id: true },
  })
}

function parseStoredMetadataValue(rawValue: string | null): unknown {
  if (!rawValue) return null
  let value: unknown
  try {
    value = JSON.parse(rawValue)
  } catch {
    return rawValue
  }
  return unwrapValue(value)
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function unwrapValue(value: unknown): unknown {
  let current = value
  while (
    typeof current === 'object' &&
    current !== null &&
    !Array.isArray(current) &&
    Object.keys(current).length === 1 &&
    'value' in current
  ) {
    current = current.value
    if (typeof current === 'string') {
      try {
        current = JSON.parse(current)
      } catch {
        return current
      }
    }
  }
  return current
}
