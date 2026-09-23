/* eslint-disable no-await-in-loop */

import { Prisma } from '@lib/prisma/generated/client'

import { db } from '@lib/db'
import {
  createDocumentEditHistoryEntry,
  markDocumentBatchesPublicationLocked,
  type EditHistoryClient,
} from '@lib/editHistory'
import { buildNameHash } from '@lib/tagHash'
import { getProtectedTagDeletionMessage, isProtectedTagName, normalizeTagName } from '@lib/tagUtils'
import { normalizeDocumentEditValue, serializeDocumentMetadataValue } from '@lib/documentEditing'
import { appendNeedsReviewReason, normalizeNeedsReviewValue } from '@lib/needsReview'
import { ACCESS_LEVEL_OPTIONS, type AccessLevelOption } from '@constants/accessLevels'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { GENERATED_DOCUMENT_STATES } from '@constants/generated/documentStates'
import { NEEDS_REVIEW_METADATA_NAME } from '@constants/documentMetadata'
import { DOCUMENT_ACCESS_LEVEL_FIELD, isEditableDocumentMetadataField } from '@constants/documentEditing'
import type {
  DocumentEditChange,
  DocumentEditContributor,
  DocumentEditPublisher,
  DocumentEditSnapshot,
  DocumentEditTag,
  DocumentEditValue,
} from 'types/documentEditing'

export class DocumentEditValidationError extends Error {
  readonly statusCode = 400
}

export class DocumentEditNotFoundError extends Error {
  readonly statusCode = 404
}

export interface ApplyDocumentEditParams {
  documentId: string
  snapshot: DocumentEditSnapshot
  editorEmail: string
}

export interface ApplyDocumentEditResult {
  changed: boolean
  changes: DocumentEditChange[]
}

export interface AuthorizeDocumentEditingParams {
  documentId: string
  reason: string
  editorEmail: string
}

export interface AuthorizeDocumentEditingResult {
  changed: boolean
  previousState: string | null
  newState: string
}

function failValidation(message: string): never {
  throw new DocumentEditValidationError(message)
}

function normalizeNullableText(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    failValidation(`${fieldName} must be a string or null.`)
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeAccessLevel(value: unknown): AccessLevelOption | null {
  const normalized = normalizeNullableText(value, DOCUMENT_ACCESS_LEVEL_FIELD)?.toLowerCase() ?? null
  if (normalized && !ACCESS_LEVEL_OPTIONS.includes(normalized as (typeof ACCESS_LEVEL_OPTIONS)[number])) {
    failValidation(`Invalid access level: ${normalized}.`)
  }
  return normalized as AccessLevelOption | null
}

function normalizeSnapshot(snapshot: DocumentEditSnapshot): DocumentEditSnapshot {
  if (!snapshot || typeof snapshot !== 'object') {
    failValidation('A document edit snapshot is required.')
  }

  if (!snapshot.quality || typeof snapshot.quality !== 'object') {
    failValidation('Document quality values are required.')
  }

  if (!Array.isArray(snapshot.tags) || !Array.isArray(snapshot.contributors) || !Array.isArray(snapshot.publishers)) {
    failValidation('Document relationship values must be arrays.')
  }

  const metadata: DocumentEditSnapshot['metadata'] = {}
  for (const [name, value] of Object.entries(snapshot.metadata ?? {})) {
    if (name === 'dc_coverage_cspatial') {
      failValidation('Use dc_coverage_spatial instead of dc_coverage_cspatial.')
    }

    if (!isEditableDocumentMetadataField(name)) {
      failValidation(`Metadata field ${name} is not editable.`)
    }

    try {
      metadata[name] = normalizeDocumentEditValue(value)
    } catch (error) {
      failValidation(error instanceof Error ? error.message : `Invalid value for ${name}.`)
    }
  }

  const tags = snapshot.tags.map((tag) => normalizeTagDraft(tag))
  const contributors = snapshot.contributors.map((contributor) => normalizeContributorDraft(contributor))
  const publishers = snapshot.publishers.map((publisher) => normalizePublisherDraft(publisher))

  assertUnique(
    tags.map((tag) => tag.tagId).filter((id): id is string => Boolean(id)),
    'tag',
  )
  assertUnique(contributors.map(contributorKey), 'contributor role')
  assertUnique(
    publishers.map((publisher) => publisher.publisherId),
    'publisher',
  )

  return {
    accessLevel: normalizeAccessLevel(snapshot.accessLevel),
    metadata,
    quality: {
      comment: normalizeNullableText(snapshot.quality.comment, 'comment'),
      commentAdditional: normalizeNullableText(snapshot.quality.commentAdditional, 'comment_additional'),
    },
    tags,
    removedTagIds: normalizeIdList(snapshot.removedTagIds),
    deleteTagIds: normalizeIdList(snapshot.deleteTagIds),
    contributors,
    publishers,
  }
}

function normalizeIdList(value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) failValidation('Tag removal values must be arrays.')

  return value.map((id) => {
    if (typeof id !== 'string' || id.trim().length === 0) {
      failValidation('Tag IDs must be non-empty strings.')
    }
    return id.trim()
  })
}

function normalizeTagDraft(tag: DocumentEditTag): DocumentEditTag {
  if (!tag || typeof tag !== 'object') {
    failValidation('Tag values must be objects.')
  }

  const tagId = tag.tagId === undefined ? undefined : (normalizeNullableText(tag.tagId, 'tagId') ?? undefined)
  const name = normalizeNullableText(tag.name, 'tag name')
  if (!tagId && !name) {
    failValidation('A staged tag must have an ID or name.')
  }

  return {
    tagId,
    name: name ?? '',
    notes: normalizeNullableText(tag.notes, 'tag notes'),
  }
}

function normalizeContributorDraft(contributor: DocumentEditContributor): DocumentEditContributor {
  if (!contributor || typeof contributor !== 'object') {
    failValidation('Contributor values must be objects.')
  }

  const contributorId = normalizeNullableText(contributor.contributorId, 'contributorId')
  const role = normalizeNullableText(contributor.role, 'contributor role')
  if (!contributorId || !role) {
    failValidation('A contributor ID and role are required.')
  }

  return {
    contributorId,
    role,
    type: normalizeNullableText(contributor.type, 'contributor type'),
    notes: normalizeNullableText(contributor.notes, 'contributor notes'),
  }
}

function normalizePublisherDraft(publisher: DocumentEditPublisher): DocumentEditPublisher {
  if (!publisher || typeof publisher !== 'object') {
    failValidation('Publisher values must be objects.')
  }

  const publisherId = normalizeNullableText(publisher.publisherId, 'publisherId')
  if (!publisherId) {
    failValidation('A publisher ID is required.')
  }

  return {
    publisherId,
    notes: normalizeNullableText(publisher.notes, 'publisher notes'),
  }
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    failValidation(`Duplicate ${label} values are not allowed.`)
  }
}

function contributorKey(contributor: { contributorId?: string; contributor_id?: string; role: string }): string {
  return `${contributor.contributorId ?? contributor.contributor_id}::${contributor.role}`
}

function storedDocumentMetadataValue(rawValue: string | null, valueType: string | null): DocumentEditValue {
  if (!rawValue) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    return normalizeDocumentEditValue(rawValue)
  }

  if (parsed && typeof parsed === 'object' && 'value' in parsed) {
    parsed = (parsed as { value?: unknown }).value
  }

  if (valueType?.toLowerCase() === 'boolean') {
    if (typeof parsed !== 'boolean') failValidation('Stored boolean metadata is invalid.')
    return parsed
  }

  if (valueType?.toLowerCase() === 'json' && Array.isArray(parsed)) {
    return normalizeDocumentEditValue(parsed)
  }

  return normalizeDocumentEditValue(parsed)
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function recordChange(
  client: EditHistoryClient,
  editorEmail: string,
  documentId: string,
  changes: DocumentEditChange[],
  fieldName: string,
  previousValue: unknown,
  newValue: unknown,
  summary: string,
): Promise<void> {
  if (valuesEqual(previousValue, newValue)) return

  await createDocumentEditHistoryEntry(client, {
    documentId,
    fieldName,
    previousValue,
    newValue,
    editorEmail,
    editSummary: summary,
  })
  changes.push({ fieldName, previousValue, newValue, summary })
}

async function applyAccessLevelChanges(
  tx: Prisma.TransactionClient,
  documentId: string,
  editorEmail: string,
  snapshot: DocumentEditSnapshot,
  currentRows: Array<{ id: string; access_level_id: string; access_levels: { level_name: string } }>,
  changes: DocumentEditChange[],
): Promise<void> {
  const currentAccessLevels = currentRows.map((row) => row.access_levels.level_name).sort()
  const currentPrimaryAccessLevel = currentAccessLevels[0] ?? null
  if (currentPrimaryAccessLevel === snapshot.accessLevel) return

  const nextAccessLevel = snapshot.accessLevel
    ? await tx.access_levels.findUnique({
        where: { level_name: snapshot.accessLevel },
        select: { id: true, level_name: true },
      })
    : null
  if (snapshot.accessLevel && !nextAccessLevel) {
    failValidation(`Access level ${snapshot.accessLevel} does not exist.`)
  }

  for (const current of currentRows) {
    await tx.document_access.delete({ where: { id: current.id } })
  }

  if (nextAccessLevel) {
    await tx.document_access.create({
      data: {
        id: crypto.randomUUID(),
        document_id: documentId,
        access_level_id: nextAccessLevel.id,
        granted_by_email: editorEmail,
        granted_at: new Date(),
      },
    })
  }

  await recordChange(
    tx,
    editorEmail,
    documentId,
    changes,
    DOCUMENT_ACCESS_LEVEL_FIELD,
    currentAccessLevels.length <= 1 ? currentPrimaryAccessLevel : currentAccessLevels,
    snapshot.accessLevel,
    `${snapshot.accessLevel === null ? 'Cleared' : 'Changed'} access level.`,
  )
}

async function applyMetadataChanges(
  tx: Prisma.TransactionClient,
  documentId: string,
  editorEmail: string,
  snapshot: DocumentEditSnapshot,
  currentRows: Array<{ id: string; value: string | null; value_type: string | null; metadata: { name: string } }>,
  changes: DocumentEditChange[],
): Promise<void> {
  const currentByName = new Map(currentRows.map((row) => [row.metadata.name, row]))

  for (const [name, nextValue] of Object.entries(snapshot.metadata)) {
    if (name === 'comment' || name === 'comment_additional' || name === 'comment_control') continue

    const current = currentByName.get(name)
    const previousValue = current ? storedDocumentMetadataValue(current.value, current.value_type) : null
    if (valuesEqual(previousValue, nextValue)) continue

    if (nextValue === null) {
      if (current) {
        await tx.document_to_metadata.delete({ where: { id: current.id } })
      }
    } else {
      const definition =
        (await tx.metadata.findFirst({ where: { name }, select: { id: true } })) ??
        (await tx.metadata.create({ data: { id: crypto.randomUUID(), name }, select: { id: true } }))
      const serialized = serializeDocumentMetadataValue(name, nextValue, current?.value_type)
      await tx.document_to_metadata.upsert({
        where: { document_id_metadata_id: { document_id: documentId, metadata_id: definition.id } },
        create: {
          id: crypto.randomUUID(),
          document_id: documentId,
          metadata_id: definition.id,
          value: serialized.value,
          value_type: serialized.valueType,
        },
        update: {
          value: serialized.value,
          value_type: serialized.valueType,
          updated_at: new Date(),
        },
      })
    }

    await recordChange(
      tx,
      editorEmail,
      documentId,
      changes,
      name,
      previousValue,
      nextValue,
      `${nextValue === null ? 'Cleared' : 'Changed'} ${name}.`,
    )
  }
}

async function applyQualityChanges(
  tx: Prisma.TransactionClient,
  documentId: string,
  editorEmail: string,
  snapshot: DocumentEditSnapshot,
  currentQuality: { comment: string | null; comment_additional: string | null } | null,
  changes: DocumentEditChange[],
): Promise<void> {
  const values: Array<[string, string, string | null, string | null]> = [
    ['comment', 'comment', currentQuality?.comment ?? null, snapshot.quality.comment],
    [
      'comment_additional',
      'comment_additional',
      currentQuality?.comment_additional ?? null,
      snapshot.quality.commentAdditional,
    ],
  ]
  const changedValues = values.filter(([, , previousValue, newValue]) => previousValue !== newValue)
  if (changedValues.length === 0) return

  const update = Object.fromEntries(changedValues.map(([, column, , newValue]) => [column, newValue]))
  await tx.document_quality.upsert({
    where: { document_id: documentId },
    create: {
      id: crypto.randomUUID(),
      document_id: documentId,
      comment: snapshot.quality.comment,
      comment_additional: snapshot.quality.commentAdditional,
    },
    update: { ...update, updated_at: new Date() },
  })

  for (const [fieldName, , previousValue, newValue] of changedValues) {
    await recordChange(
      tx,
      editorEmail,
      documentId,
      changes,
      fieldName,
      previousValue,
      newValue,
      `${newValue === null ? 'Cleared' : 'Changed'} ${fieldName}.`,
    )
  }
}

async function applyTagChanges(
  tx: Prisma.TransactionClient,
  documentId: string,
  editorEmail: string,
  snapshot: DocumentEditSnapshot,
  currentRows: Array<{ id: string; tag_id: string; notes: string | null; tags: { id: string; name: string } }>,
  changes: DocumentEditChange[],
): Promise<void> {
  const resolvedTags: Array<{ tagId: string; name: string; notes: string | null }> = []
  for (const draft of snapshot.tags) {
    if (draft.tagId) {
      const tag = await tx.tags.findUnique({ where: { id: draft.tagId }, select: { id: true, name: true } })
      if (!tag) failValidation(`Tag ${draft.tagId} does not exist.`)
      resolvedTags.push({ tagId: tag.id, name: tag.name, notes: draft.notes })
      continue
    }

    const name = normalizeTagName(draft.name)
    if (!name) failValidation('New tag names cannot be empty.')
    const nameHash = buildNameHash(name)
    const existing = await tx.tags.findFirst({
      where: { OR: [{ name_hash: nameHash }, { name }] },
      select: { id: true, name: true },
    })
    const tag =
      existing ??
      (await tx.tags.create({
        data: { id: crypto.randomUUID(), name, name_hash: nameHash, notes: draft.notes },
        select: { id: true, name: true },
      }))
    resolvedTags.push({ tagId: tag.id, name: tag.name, notes: draft.notes })
  }

  const currentByTagId = new Map(currentRows.map((row) => [row.tag_id, row]))
  const nextByTagId = new Map(resolvedTags.map((tag) => [tag.tagId, tag]))

  for (const current of currentRows) {
    if (nextByTagId.has(current.tag_id)) continue
    if (snapshot.deleteTagIds?.includes(current.tag_id) && isProtectedTagName(current.tags.name)) {
      failValidation(getProtectedTagDeletionMessage(current.tags.name))
    }

    await tx.document_to_tags.delete({ where: { id: current.id } })
    await recordChange(
      tx,
      editorEmail,
      documentId,
      changes,
      `tag:${current.tag_id}`,
      { id: current.tag_id, name: current.tags.name, notes: current.notes },
      null,
      `Removed tag "${current.tags.name}" from document.`,
    )

    if (snapshot.deleteTagIds?.includes(current.tag_id)) {
      const remainingUsage = await tx.document_to_tags.count({ where: { tag_id: current.tag_id } })
      if (remainingUsage === 0) {
        await tx.tags.delete({ where: { id: current.tag_id } })
      }
    }
  }

  for (const next of resolvedTags) {
    const current = currentByTagId.get(next.tagId)
    if (!current) {
      const created = await tx.document_to_tags.create({
        data: { id: crypto.randomUUID(), document_id: documentId, tag_id: next.tagId, notes: next.notes },
        include: { tags: true },
      })
      await recordChange(
        tx,
        editorEmail,
        documentId,
        changes,
        `tag:${next.tagId}`,
        null,
        { id: next.tagId, name: created.tags.name, notes: next.notes },
        `Added tag "${created.tags.name}" to document.`,
      )
      continue
    }

    if (current.notes !== next.notes) {
      await tx.document_to_tags.update({ where: { id: current.id }, data: { notes: next.notes } })
      await recordChange(
        tx,
        editorEmail,
        documentId,
        changes,
        `tag:${next.tagId}:notes`,
        current.notes,
        next.notes,
        `Changed notes for tag "${current.tags.name}".`,
      )
    }
  }
}

async function applyContributorChanges(
  tx: Prisma.TransactionClient,
  documentId: string,
  editorEmail: string,
  snapshot: DocumentEditSnapshot,
  currentRows: Array<{
    id: string
    contributor_id: string
    role: string
    type: string | null
    notes: string | null
    contributors: { name: string }
  }>,
  changes: DocumentEditChange[],
): Promise<void> {
  const nextByKey = new Map(snapshot.contributors.map((contributor) => [contributorKey(contributor), contributor]))
  const currentByKey = new Map(currentRows.map((row) => [contributorKey(row), row]))

  for (const next of snapshot.contributors) {
    const contributor = await tx.contributors.findUnique({
      where: { id: next.contributorId },
      select: { id: true, name: true },
    })
    if (!contributor) failValidation(`Contributor ${next.contributorId} does not exist.`)

    const key = contributorKey(next)
    const current = currentByKey.get(key)
    if (!current) {
      const created = await tx.document_to_contributors.create({
        data: {
          id: crypto.randomUUID(),
          document_id: documentId,
          contributor_id: next.contributorId,
          role: next.role,
          type: next.type,
          notes: next.notes,
        },
        include: { contributors: true },
      })
      await recordChange(
        tx,
        editorEmail,
        documentId,
        changes,
        `contributor:${key}`,
        null,
        created,
        `Added contributor "${contributor.name}".`,
      )
      continue
    }

    if (current.type !== next.type || current.notes !== next.notes) {
      await tx.document_to_contributors.update({
        where: { id: current.id },
        data: { type: next.type, notes: next.notes, updated_at: new Date() },
      })
      await recordChange(
        tx,
        editorEmail,
        documentId,
        changes,
        `contributor:${key}`,
        { contributorId: current.contributor_id, role: current.role, type: current.type, notes: current.notes },
        next,
        `Changed contributor "${contributor.name}".`,
      )
    }
  }

  for (const current of currentRows) {
    const key = contributorKey(current)
    if (nextByKey.has(key)) continue
    await tx.document_to_contributors.delete({ where: { id: current.id } })
    await recordChange(
      tx,
      editorEmail,
      documentId,
      changes,
      `contributor:${key}`,
      { contributorId: current.contributor_id, role: current.role, type: current.type, notes: current.notes },
      null,
      `Removed contributor "${current.contributors.name}".`,
    )
  }
}

async function applyPublisherChanges(
  tx: Prisma.TransactionClient,
  documentId: string,
  editorEmail: string,
  snapshot: DocumentEditSnapshot,
  currentRows: Array<{ id: string; publisher_id: string; notes: string | null; publishers: { name: string } }>,
  changes: DocumentEditChange[],
): Promise<void> {
  const nextById = new Map(snapshot.publishers.map((publisher) => [publisher.publisherId, publisher]))
  const currentById = new Map(currentRows.map((row) => [row.publisher_id, row]))

  for (const next of snapshot.publishers) {
    const publisher = await tx.publishers.findUnique({
      where: { id: next.publisherId },
      select: { id: true, name: true },
    })
    if (!publisher) failValidation(`Publisher ${next.publisherId} does not exist.`)

    const current = currentById.get(next.publisherId)
    if (!current) {
      const created = await tx.document_to_publishers.create({
        data: {
          id: crypto.randomUUID(),
          document_id: documentId,
          publisher_id: next.publisherId,
          notes: next.notes,
        },
        include: { publishers: true },
      })
      await recordChange(
        tx,
        editorEmail,
        documentId,
        changes,
        `publisher:${next.publisherId}`,
        null,
        created,
        `Added publisher "${publisher.name}".`,
      )
      continue
    }

    if (current.notes !== next.notes) {
      await tx.document_to_publishers.update({
        where: { id: current.id },
        data: { notes: next.notes, updated_at: new Date() },
      })
      await recordChange(
        tx,
        editorEmail,
        documentId,
        changes,
        `publisher:${next.publisherId}`,
        { publisherId: current.publisher_id, notes: current.notes },
        next,
        `Changed publisher "${publisher.name}".`,
      )
    }
  }

  for (const current of currentRows) {
    if (nextById.has(current.publisher_id)) continue
    await tx.document_to_publishers.delete({ where: { id: current.id } })
    await recordChange(
      tx,
      editorEmail,
      documentId,
      changes,
      `publisher:${current.publisher_id}`,
      { publisherId: current.publisher_id, notes: current.notes },
      null,
      `Removed publisher "${current.publishers.name}".`,
    )
  }
}

export async function applyDocumentEditInTransaction(
  tx: Prisma.TransactionClient,
  params: ApplyDocumentEditParams,
): Promise<ApplyDocumentEditResult> {
  const snapshot = normalizeSnapshot(params.snapshot)
  const editorEmail = params.editorEmail.trim()
  if (!editorEmail) failValidation('An authenticated editor email is required.')

  const document = await tx.documents.findUnique({ where: { id: params.documentId }, select: { id: true } })
  if (!document) {
    throw new DocumentEditNotFoundError('Document not found.')
  }

  const [metadataRows, quality, tagRows, contributorRows, publisherRows, accessRows] = await Promise.all([
    tx.document_to_metadata.findMany({ where: { document_id: params.documentId }, include: { metadata: true } }),
    tx.document_quality.findUnique({
      where: { document_id: params.documentId },
      select: { comment: true, comment_additional: true },
    }),
    tx.document_to_tags.findMany({ where: { document_id: params.documentId }, include: { tags: true } }),
    tx.document_to_contributors.findMany({
      where: { document_id: params.documentId },
      include: { contributors: true },
    }),
    tx.document_to_publishers.findMany({ where: { document_id: params.documentId }, include: { publishers: true } }),
    tx.document_access.findMany({ where: { document_id: params.documentId }, include: { access_levels: true } }),
  ])
  const changes: DocumentEditChange[] = []

  await applyAccessLevelChanges(tx, params.documentId, editorEmail, snapshot, accessRows, changes)
  await applyMetadataChanges(tx, params.documentId, editorEmail, snapshot, metadataRows, changes)
  await applyQualityChanges(tx, params.documentId, editorEmail, snapshot, quality, changes)
  await applyTagChanges(tx, params.documentId, editorEmail, snapshot, tagRows, changes)
  await applyContributorChanges(tx, params.documentId, editorEmail, snapshot, contributorRows, changes)
  await applyPublisherChanges(tx, params.documentId, editorEmail, snapshot, publisherRows, changes)

  if (changes.length > 0) {
    await markDocumentBatchesPublicationLocked(tx, params.documentId)
  }

  return { changed: changes.length > 0, changes }
}

export async function applyDocumentEdit(params: ApplyDocumentEditParams): Promise<ApplyDocumentEditResult> {
  const snapshot = normalizeSnapshot(params.snapshot)
  return db.$transaction((tx) => applyDocumentEditInTransaction(tx, { ...params, snapshot }))
}

export async function authorizeDocumentEditingInTransaction(
  tx: Prisma.TransactionClient,
  params: AuthorizeDocumentEditingParams,
): Promise<AuthorizeDocumentEditingResult> {
  const reason = params.reason.trim()
  const editorEmail = params.editorEmail.trim()
  if (!reason) failValidation('A reason is required before editing an approved or published document.')
  if (!editorEmail) failValidation('An authenticated editor email is required.')

  const document = await tx.documents.findUnique({ where: { id: params.documentId }, select: { id: true } })
  if (!document) throw new DocumentEditNotFoundError('Document not found.')

  const [quality, publishedBatch, reviewMetadata] = await Promise.all([
    tx.document_quality.findUnique({
      where: { document_id: params.documentId },
      select: {
        id: true,
        validation_status: true,
        current_status: true,
        state_history: { select: { new_state: true } },
      },
    }),
    tx.document_to_batches.findFirst({
      where: {
        document_id: params.documentId,
        batches: { lifecycle_status: GENERATED_BATCH_LIFECYCLE_STATUSES.PUBLISHED },
      },
      select: { id: true },
    }),
    tx.document_to_metadata.findFirst({
      where: { document_id: params.documentId, metadata: { name: NEEDS_REVIEW_METADATA_NAME } },
      select: { id: true, metadata_id: true, value: true },
    }),
  ])

  const isApproved = quality?.validation_status?.toString().toUpperCase() === 'APPROVED'
  const isPublished =
    quality?.state_history?.new_state === GENERATED_DOCUMENT_STATES.INGESTED_FEDORA || Boolean(publishedBatch)
  if (!isApproved && !isPublished) {
    failValidation('This document is not approved or published and does not require edit authorization.')
  }

  const previousState = quality?.state_history?.new_state ?? null
  const nextReviewValue = appendNeedsReviewReason(reviewMetadata?.value, reason)
  if (reviewMetadata) {
    await tx.document_to_metadata.update({
      where: { id: reviewMetadata.id },
      data: { value: JSON.stringify({ value: nextReviewValue }), value_type: 'json', updated_at: new Date() },
    })
  } else {
    const definition =
      (await tx.metadata.findFirst({ where: { name: NEEDS_REVIEW_METADATA_NAME }, select: { id: true } })) ??
      (await tx.metadata.create({
        data: { id: crypto.randomUUID(), name: NEEDS_REVIEW_METADATA_NAME },
        select: { id: true },
      }))
    await tx.document_to_metadata.create({
      data: {
        id: crypto.randomUUID(),
        document_id: params.documentId,
        metadata_id: definition.id,
        value: JSON.stringify({ value: nextReviewValue }),
        value_type: 'json',
      },
    })
  }

  const state = await tx.state_history.create({
    data: {
      id: crypto.randomUUID(),
      document_id: params.documentId,
      previous_state: previousState,
      new_state: GENERATED_DOCUMENT_STATES.NEEDS_REVIEW,
      changed_at: new Date(),
    },
    select: { id: true },
  })

  if (quality) {
    await tx.document_quality.update({
      where: { document_id: params.documentId },
      data: {
        current_status: state.id,
        validation_status: 'NEEDS_REVIEW',
        validation_timestamp: Math.floor(Date.now() / 1000),
        updated_at: new Date(),
      },
    })
  } else {
    await tx.document_quality.create({
      data: {
        id: crypto.randomUUID(),
        document_id: params.documentId,
        current_status: state.id,
        validation_status: 'NEEDS_REVIEW',
        validation_timestamp: Math.floor(Date.now() / 1000),
      },
    })
  }

  await createDocumentEditHistoryEntry(tx, {
    documentId: params.documentId,
    fieldName: NEEDS_REVIEW_METADATA_NAME,
    previousValue: reviewMetadata ? normalizeNeedsReviewValue(reviewMetadata.value) : null,
    newValue: nextReviewValue,
    editorEmail,
    editSummary: `Authorized editing after approval or publication: ${reason}`,
  })
  await markDocumentBatchesPublicationLocked(tx, params.documentId)

  return { changed: true, previousState, newState: GENERATED_DOCUMENT_STATES.NEEDS_REVIEW }
}

export async function authorizeDocumentEditing(
  params: AuthorizeDocumentEditingParams,
): Promise<AuthorizeDocumentEditingResult> {
  return db.$transaction((tx) => authorizeDocumentEditingInTransaction(tx, params))
}
