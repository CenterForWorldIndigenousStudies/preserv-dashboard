import { randomUUID } from 'node:crypto'

import { db } from '@lib/db'
import { getExclusionReviewConfig } from '@lib/exclusionReviewConfig'
import {
  getExclusionReviewRootFromDrive,
  listExclusionReviewChildrenFromDrive,
  resolveExclusionReviewAncestorChain,
  searchExclusionReviewDriveByName,
} from '@lib/exclusionReviewDrive'
import { Prisma, type drive_exclusion_review_items } from '@lib/prisma/generated/client'
import type { QueryDbClient } from '@lib/queries'
import type {
  ApplyDecisionInput,
  DriveIndexItem,
  ExclusionReviewAggregateFolderStatus,
  ExclusionReviewBranchPage,
  ExclusionReviewBranchSyncResult,
  ExclusionReviewDecision,
  ExclusionReviewMutationResult,
  ExclusionReviewSearchResult,
  ExclusionReviewSubtreeIndexStatus,
  ExclusionReviewTreeNode,
  ExclusionReviewTreePayload,
} from 'types/exclusionReview'

type LineageSnapshot = {
  effectiveAncestorDriveId: string | null
  effectiveAncestorDecision: ExclusionReviewDecision
  effectiveAncestorReviewedAt: Date | null
}

function getRootDriveId(): string {
  return getExclusionReviewConfig().rootFolderId
}

function serializePath(path: string[]): string {
  return JSON.stringify(path)
}

function parsePath(path: string): string[] {
  try {
    const parsed: unknown = JSON.parse(path)
    return Array.isArray(parsed)
      ? parsed.map((value) => String(value).trim()).filter(Boolean)
      : []
  } catch {
    return []
  }
}

function toDecision(value: string | null | undefined): ExclusionReviewDecision {
  return value === 'include' || value === 'exclude' ? value : null
}

function toSubtreeStatus(value: string | null | undefined): ExclusionReviewSubtreeIndexStatus {
  return value === 'syncing' ||
    value === 'complete' ||
    value === 'error' ||
    value === 'pending'
    ? value
    : 'pending'
}

function buildDriveUrl(itemType: string, driveId: string): string {
  return itemType === 'folder'
    ? `https://drive.google.com/drive/folders/${driveId}`
    : `https://drive.google.com/file/d/${driveId}/view`
}

function compareTreeNodes(left: ExclusionReviewTreeNode, right: ExclusionReviewTreeNode): number {
  if (left.itemType !== right.itemType) {
    return left.itemType === 'folder' ? -1 : 1
  }

  return left.name.localeCompare(right.name)
}

function compareRecords(left: drive_exclusion_review_items, right: drive_exclusion_review_items): number {
  if (left.depth !== right.depth) {
    return left.depth - right.depth
  }

  if (left.item_type !== right.item_type) {
    return left.item_type === 'folder' ? -1 : 1
  }

  return left.name.localeCompare(right.name)
}

export function deriveEffectiveDecision(input: {
  explicitDecision: ExclusionReviewDecision
  effectiveAncestorDecision: ExclusionReviewDecision
}): ExclusionReviewDecision {
  return input.effectiveAncestorDecision ?? input.explicitDecision ?? null
}

export function reconcileInheritedLineage(input: {
  nextPath: string[]
  previousEffectiveAncestorDriveId: string | null
  previousEffectiveAncestorDecision: ExclusionReviewDecision
  previousEffectiveAncestorReviewedAt: Date | null
}): LineageSnapshot {
  const stillUnderSameAncestor =
    !!input.previousEffectiveAncestorDriveId &&
    input.nextPath.includes(input.previousEffectiveAncestorDriveId)

  if (!stillUnderSameAncestor) {
    return {
      effectiveAncestorDriveId: null,
      effectiveAncestorDecision: null,
      effectiveAncestorReviewedAt: null,
    }
  }

  return {
    effectiveAncestorDriveId: input.previousEffectiveAncestorDriveId,
    effectiveAncestorDecision: input.previousEffectiveAncestorDecision,
    effectiveAncestorReviewedAt: input.previousEffectiveAncestorReviewedAt,
  }
}

function computeAggregateFolderStatus(
  record: drive_exclusion_review_items,
  branchRows: drive_exclusion_review_items[],
): ExclusionReviewAggregateFolderStatus {
  if (record.item_type !== 'folder' || toSubtreeStatus(record.subtree_index_status) !== 'complete') {
    return null
  }

  const descendants = branchRows.filter((candidate) => {
    if (candidate.drive_id === record.drive_id) {
      return false
    }

    return parsePath(candidate.path).includes(record.drive_id)
  })

  if (descendants.length === 0) {
    return null
  }

  const effectiveDecisions = descendants.map((candidate) =>
    deriveEffectiveDecision({
      explicitDecision: toDecision(candidate.explicit_review_decision),
      effectiveAncestorDecision: toDecision(candidate.effective_ancestor_decision),
    }),
  )

  if (effectiveDecisions.some((decision) => decision === null)) {
    return null
  }

  if (effectiveDecisions.every((decision) => decision === 'include')) {
    return 'allIncluded'
  }

  if (effectiveDecisions.every((decision) => decision === 'exclude')) {
    return 'allExcluded'
  }

  return 'mixedReviewed'
}

function toTreeNode(
  record: drive_exclusion_review_items,
  branchRows: drive_exclusion_review_items[] = [],
): ExclusionReviewTreeNode {
  const explicitDecision = toDecision(record.explicit_review_decision)
  const effectiveAncestorDecision = toDecision(record.effective_ancestor_decision)

  return {
    driveId: record.drive_id,
    parentDriveId: record.parent_drive_id ?? null,
    itemType: record.item_type === 'folder' ? 'folder' : 'file',
    name: record.name,
    mimeType: record.mime_type ?? null,
    driveUrl:
      record.drive_url?.trim() || buildDriveUrl(record.item_type, record.drive_id),
    path: parsePath(record.path),
    depth: record.depth,
    explicitDecision,
    effectiveDecision: deriveEffectiveDecision({
      explicitDecision,
      effectiveAncestorDecision,
    }),
    effectiveAncestorDriveId: record.effective_ancestor_drive_id ?? null,
    effectiveAncestorDecision,
    subtreeIndexStatus: toSubtreeStatus(record.subtree_index_status),
    aggregateFolderStatus: computeAggregateFolderStatus(record, branchRows),
    isInheritedLocked: effectiveAncestorDecision !== null,
    hasChildren: record.item_type === 'folder',
  }
}

async function getIndexedItem(
  rootDriveId: string,
  driveId: string,
  client: QueryDbClient,
): Promise<drive_exclusion_review_items | null> {
  return client.drive_exclusion_review_items.findUnique({
    where: {
      root_drive_id_drive_id: {
        root_drive_id: rootDriveId,
        drive_id: driveId,
      },
    },
  })
}

async function getIndexedItemsByDriveIds(
  rootDriveId: string,
  driveIds: string[],
  client: QueryDbClient,
): Promise<drive_exclusion_review_items[]> {
  const uniqueDriveIds = [...new Set(driveIds)]
  if (uniqueDriveIds.length === 0) {
    return []
  }

  const rows = await client.drive_exclusion_review_items.findMany({
    where: {
      root_drive_id: rootDriveId,
      drive_id: { in: uniqueDriveIds },
    },
  })

  return rows.sort(compareRecords)
}

async function findIndexedItemsByName(
  rootDriveId: string,
  query: string,
  client: QueryDbClient,
): Promise<drive_exclusion_review_items[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return []
  }

  const rows = await client.drive_exclusion_review_items.findMany({
    where: {
      root_drive_id: rootDriveId,
      name: {
        contains: trimmedQuery,
      },
    },
  })

  return rows.sort(compareRecords)
}

async function buildSearchResultFromIndexedRows(
  rootDriveId: string,
  matchRows: drive_exclusion_review_items[],
  query: string,
  client: QueryDbClient,
): Promise<ExclusionReviewSearchResult> {
  const ancestorDriveIdsToExpand = new Set<string>()
  const pathNodesByDriveId = new Map<string, ExclusionReviewTreeNode>()
  const matches: ExclusionReviewTreeNode[] = []

  /* eslint-disable no-await-in-loop */
  for (const matchRow of matchRows) {
    const matchNode = toTreeNode(matchRow)
    matches.push(matchNode)

    for (const ancestorDriveId of matchNode.path) {
      ancestorDriveIdsToExpand.add(ancestorDriveId)
    }

    const pathRows = await getIndexedItemsByDriveIds(
      rootDriveId,
      [...matchNode.path, matchNode.driveId],
      client,
    )
    for (const pathRow of pathRows) {
      pathNodesByDriveId.set(pathRow.drive_id, toTreeNode(pathRow))
    }

    pathNodesByDriveId.set(matchNode.driveId, matchNode)
  }
  /* eslint-enable no-await-in-loop */

  return {
    query,
    matches: matches.sort(compareTreeNodes),
    ancestorDriveIdsToExpand: [...ancestorDriveIdsToExpand],
    pathNodes: [...pathNodesByDriveId.values()].sort(compareTreeNodes),
  }
}

async function getBranchRows(
  rootDriveId: string,
  driveId: string,
  client: QueryDbClient,
): Promise<drive_exclusion_review_items[]> {
  const rows = await client.$queryRaw<drive_exclusion_review_items[]>(Prisma.sql`
    SELECT *
    FROM drive_exclusion_review_items
    WHERE root_drive_id = ${rootDriveId}
      AND (
        drive_id = ${driveId}
        OR JSON_CONTAINS(path, JSON_QUOTE(${driveId}), '$')
      )
    ORDER BY depth ASC, name ASC
  `)

  return rows.sort(compareRecords)
}

async function upsertDriveIndexItems(
  rootDriveId: string,
  items: DriveIndexItem[],
  client: QueryDbClient,
  options: {
    folderStatus?: ExclusionReviewSubtreeIndexStatus
    syncedAt?: Date
  } = {},
): Promise<void> {
  const syncedAt = options.syncedAt ?? new Date()

  await Promise.all(
    items.map((item) =>
      client.drive_exclusion_review_items.upsert({
        where: {
          root_drive_id_drive_id: {
            root_drive_id: rootDriveId,
            drive_id: item.driveId,
          },
        },
        update: {
          parent_drive_id: item.parentDriveId,
          item_type: item.itemType,
          name: item.name,
          mime_type: item.mimeType,
          drive_url: item.driveUrl,
          path: serializePath(item.path),
          depth: item.depth,
          subtree_index_status:
            item.itemType === 'file' ? 'complete' : options.folderStatus ?? 'pending',
          last_synced_at: syncedAt,
          last_sync_error: null,
          updated_at: syncedAt,
        },
        create: {
          id: randomUUID(),
          root_drive_id: rootDriveId,
          drive_id: item.driveId,
          parent_drive_id: item.parentDriveId,
          item_type: item.itemType,
          name: item.name,
          mime_type: item.mimeType,
          drive_url: item.driveUrl,
          path: serializePath(item.path),
          depth: item.depth,
          subtree_index_status:
            item.itemType === 'file' ? 'complete' : options.folderStatus ?? 'pending',
          discovered_at: syncedAt,
          last_synced_at: syncedAt,
          last_sync_error: null,
          created_at: syncedAt,
          updated_at: syncedAt,
        },
      }),
    ),
  )
}

async function ensureRootIndexed(
  client: QueryDbClient,
): Promise<drive_exclusion_review_items> {
  const rootDriveId = getRootDriveId()
  const existing = await getIndexedItem(rootDriveId, rootDriveId, client)
  if (existing) {
    return existing
  }

  const rootItem = await getExclusionReviewRootFromDrive()
  await upsertDriveIndexItems(rootDriveId, [rootItem], client, {
    folderStatus: 'pending',
  })

  const created = await getIndexedItem(rootDriveId, rootDriveId, client)
  if (!created) {
    throw new Error(`Unable to index configured root ${rootDriveId}.`)
  }

  return created
}

async function ensureDriveItemIndexed(
  rootDriveId: string,
  driveId: string,
  client: QueryDbClient,
): Promise<drive_exclusion_review_items> {
  const existing = await getIndexedItem(rootDriveId, driveId, client)
  if (existing) {
    return existing
  }

  const chain = await resolveExclusionReviewAncestorChain(driveId)
  await upsertDriveIndexItems(rootDriveId, chain, client)

  const created = await getIndexedItem(rootDriveId, driveId, client)
  if (!created) {
    throw new Error(`Unable to index Drive item ${driveId}.`)
  }

  return created
}

function findNearestMarkedAncestor(
  record: drive_exclusion_review_items,
  rowByDriveId: Map<string, drive_exclusion_review_items>,
): drive_exclusion_review_items | null {
  for (const ancestorDriveId of [...parsePath(record.path)].reverse()) {
    const ancestor = rowByDriveId.get(ancestorDriveId)
    if (ancestor?.item_type === 'folder' && toDecision(ancestor.explicit_review_decision)) {
      return ancestor
    }
  }

  return null
}

async function recomputeBranchInheritedLineage(
  rootDriveId: string,
  driveId: string,
  client: QueryDbClient,
): Promise<drive_exclusion_review_items[]> {
  const branchRows = await getBranchRows(rootDriveId, driveId, client)
  if (branchRows.length === 0) {
    return []
  }

  const targetRow = branchRows.find((row) => row.drive_id === driveId) ?? branchRows[0]
  const ancestorIds = parsePath(targetRow.path)
  const ancestorRows = ancestorIds.length
    ? await client.drive_exclusion_review_items.findMany({
        where: {
          root_drive_id: rootDriveId,
          drive_id: { in: ancestorIds },
        },
      })
    : []
  const rowByDriveId = new Map(
    [...ancestorRows, ...branchRows].map((row) => [row.drive_id, row]),
  )

  await Promise.all(
    branchRows.map(async (row) => {
      const nearestMarkedAncestor = findNearestMarkedAncestor(row, rowByDriveId)
      const nextLineage: LineageSnapshot = nearestMarkedAncestor
        ? {
            effectiveAncestorDriveId: nearestMarkedAncestor.drive_id,
            effectiveAncestorDecision: toDecision(
              nearestMarkedAncestor.explicit_review_decision,
            ),
            effectiveAncestorReviewedAt:
              nearestMarkedAncestor.explicit_reviewed_at ?? null,
          }
        : {
            effectiveAncestorDriveId: null,
            effectiveAncestorDecision: null,
            effectiveAncestorReviewedAt: null,
          }

      await client.drive_exclusion_review_items.update({
        where: {
          root_drive_id_drive_id: {
            root_drive_id: rootDriveId,
            drive_id: row.drive_id,
          },
        },
        data: {
          effective_ancestor_drive_id: nextLineage.effectiveAncestorDriveId,
          effective_ancestor_decision: nextLineage.effectiveAncestorDecision,
          effective_ancestor_reviewed_at: nextLineage.effectiveAncestorReviewedAt,
        },
      })
    }),
  )

  return client.drive_exclusion_review_items.findMany({
    where: {
      root_drive_id: rootDriveId,
      drive_id: { in: branchRows.map((row) => row.drive_id) },
    },
    orderBy: [{ depth: 'asc' }, { name: 'asc' }],
  })
}

async function shiftIndexedDescendantPaths(
  rootDriveId: string,
  movedDriveId: string,
  previousPath: string[],
  nextPath: string[],
  client: QueryDbClient,
): Promise<void> {
  if (serializePath(previousPath) === serializePath(nextPath)) {
    return
  }

  const branchRows = await getBranchRows(rootDriveId, movedDriveId, client)
  const descendants = branchRows.filter((row) => row.drive_id !== movedDriveId)

  await Promise.all(
    descendants.map(async (row) => {
      const currentPath = parsePath(row.path)
      const movedIndex = currentPath.indexOf(movedDriveId)
      if (movedIndex === -1) {
        return
      }

      const updatedPath = [...nextPath, ...currentPath.slice(movedIndex)]

      await client.drive_exclusion_review_items.update({
        where: {
          root_drive_id_drive_id: {
            root_drive_id: rootDriveId,
            drive_id: row.drive_id,
          },
        },
        data: {
          path: serializePath(updatedPath),
          depth: updatedPath.length,
        },
      })
    }),
  )
}

async function reconcileMissingDirectChildren(
  rootDriveId: string,
  parentDriveId: string,
  seenChildDriveIds: Set<string>,
  client: QueryDbClient,
): Promise<void> {
  const existingChildren = await client.drive_exclusion_review_items.findMany({
    where: {
      root_drive_id: rootDriveId,
      parent_drive_id: parentDriveId,
    },
  })
  const syncedAt = new Date()

  /* eslint-disable no-await-in-loop */
  for (const missingChild of existingChildren) {
    if (seenChildDriveIds.has(missingChild.drive_id)) {
      continue
    }

    const previousPath = parsePath(missingChild.path)

    try {
      const chain = await resolveExclusionReviewAncestorChain(missingChild.drive_id)
      const movedItem = chain.at(-1)
      if (!movedItem) {
        continue
      }

      await upsertDriveIndexItems(rootDriveId, chain, client, {
        syncedAt,
      })

      if (missingChild.item_type === 'folder') {
        await shiftIndexedDescendantPaths(
          rootDriveId,
          missingChild.drive_id,
          previousPath,
          movedItem.path,
          client,
        )
      }

      await recomputeBranchInheritedLineage(rootDriveId, missingChild.drive_id, client)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reconcile moved branch.'

      await client.drive_exclusion_review_items.update({
        where: {
          root_drive_id_drive_id: {
            root_drive_id: rootDriveId,
            drive_id: missingChild.drive_id,
          },
        },
        data: {
          last_sync_error: message,
          subtree_index_status:
            missingChild.item_type === 'folder' ? 'error' : 'complete',
          updated_at: syncedAt,
        },
      })
    }
  }
  /* eslint-enable no-await-in-loop */
}

async function syncDirectChildrenPage(
  rootDriveId: string,
  parentDriveId: string,
  pageToken: string | null | undefined,
  client: QueryDbClient,
): Promise<ExclusionReviewBranchPage> {
  const indexedParentRow = await ensureDriveItemIndexed(
    rootDriveId,
    parentDriveId,
    client,
  )
  const syncedAt = new Date()
  const page = await listExclusionReviewChildrenFromDrive(
    parentDriveId,
    pageToken ?? undefined,
    [...parsePath(indexedParentRow.path), indexedParentRow.drive_id],
  )

  await upsertDriveIndexItems(rootDriveId, page.items, client, { syncedAt })
  const branchRows = await recomputeBranchInheritedLineage(
    rootDriveId,
    parentDriveId,
    client,
  )
  const branchRowsByDriveId = new Map(
    branchRows.map((row) => [row.drive_id, row]),
  )
  const parentRow = branchRowsByDriveId.get(parentDriveId)

  const items = page.items
    .map((item) => {
      const record = branchRowsByDriveId.get(item.driveId)
      return record ? toTreeNode(record, branchRows) : null
    })
    .filter((item): item is ExclusionReviewTreeNode => item !== null)
    .sort(compareTreeNodes)

  return {
    parentDriveId,
    items,
    nextPageToken: page.nextPageToken,
    hasMore: page.nextPageToken !== null,
    branchSyncStatus: toSubtreeStatus(parentRow?.subtree_index_status),
  }
}

export async function loadExclusionReviewRootTree(
  client: QueryDbClient = db,
): Promise<ExclusionReviewTreePayload> {
  const rootRow = await ensureRootIndexed(client)
  const rootChildren = await syncDirectChildrenPage(
    rootRow.root_drive_id,
    rootRow.drive_id,
    null,
    client,
  )
  const refreshedRoot = await getIndexedItem(rootRow.root_drive_id, rootRow.drive_id, client)

  if (!refreshedRoot) {
    throw new Error(`Unable to load configured root ${rootRow.drive_id}.`)
  }

  return {
    root: toTreeNode(refreshedRoot),
    rootChildren,
  }
}

export async function loadExclusionReviewChildren(
  parentDriveId: string,
  pageToken: string | null = null,
  client: QueryDbClient = db,
): Promise<ExclusionReviewBranchPage> {
  return syncDirectChildrenPage(getRootDriveId(), parentDriveId, pageToken, client)
}

export async function applyExclusionReviewDecision(
  input: ApplyDecisionInput,
  client: QueryDbClient = db,
): Promise<ExclusionReviewMutationResult> {
  const rootDriveId = getRootDriveId()
  await ensureDriveItemIndexed(rootDriveId, input.driveId, client)

  const updatedAt = new Date()
  const target = await client.drive_exclusion_review_items.update({
    where: {
      root_drive_id_drive_id: {
        root_drive_id: rootDriveId,
        drive_id: input.driveId,
      },
    },
    data: {
      explicit_review_decision: input.decision,
      explicit_reviewed_by_email: input.decision ? input.reviewerEmail : null,
      explicit_reviewed_at: input.decision ? updatedAt : null,
      updated_at: updatedAt,
      last_sync_error: null,
    },
  })

  const updatedRows = await recomputeBranchInheritedLineage(
    rootDriveId,
    target.drive_id,
    client,
  )

  return {
    updatedAt: updatedAt.toISOString(),
    updatedNodes: updatedRows.map((row) => toTreeNode(row, updatedRows)),
  }
}

export async function searchExclusionReviewTree(
  query: string,
  client: QueryDbClient = db,
): Promise<ExclusionReviewSearchResult> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return {
      query: '',
      matches: [],
      ancestorDriveIdsToExpand: [],
      pathNodes: [],
    }
  }

  const rootDriveId = getRootDriveId()
  const indexedMatches = await findIndexedItemsByName(rootDriveId, trimmedQuery, client)
  if (indexedMatches.length > 0) {
    return buildSearchResultFromIndexedRows(
      rootDriveId,
      indexedMatches,
      trimmedQuery,
      client,
    )
  }

  const liveMatches = await searchExclusionReviewDriveByName(trimmedQuery)
  const ancestorDriveIdsToExpand = new Set<string>()
  const matches: ExclusionReviewTreeNode[] = []
  const pathNodesByDriveId = new Map<string, ExclusionReviewTreeNode>()

  /* eslint-disable no-await-in-loop */
  for (const liveMatch of liveMatches) {
    const chain = await resolveExclusionReviewAncestorChain(liveMatch.driveId)
    for (const ancestorDriveId of chain.slice(0, -1).map((item) => item.driveId)) {
      ancestorDriveIdsToExpand.add(ancestorDriveId)
    }

    await upsertDriveIndexItems(rootDriveId, chain, client, {
      syncedAt: new Date(),
    })
    const updatedRows = await recomputeBranchInheritedLineage(
      rootDriveId,
      liveMatch.driveId,
      client,
    )
    const chainRows = await getIndexedItemsByDriveIds(
      rootDriveId,
      chain.map((item) => item.driveId),
      client,
    )
    for (const chainRow of chainRows) {
      pathNodesByDriveId.set(chainRow.drive_id, toTreeNode(chainRow))
    }

    const matchRow = updatedRows.find((row) => row.drive_id === liveMatch.driveId)
    if (matchRow) {
      const matchNode = toTreeNode(matchRow, updatedRows)
      matches.push(matchNode)
      pathNodesByDriveId.set(matchNode.driveId, matchNode)
    }
  }
  /* eslint-enable no-await-in-loop */

  return {
    query: trimmedQuery,
    matches: matches.sort(compareTreeNodes),
    ancestorDriveIdsToExpand: [...ancestorDriveIdsToExpand],
    pathNodes: [...pathNodesByDriveId.values()].sort(compareTreeNodes),
  }
}

export async function reconcileExclusionReviewBranch(
  driveId: string,
  client: QueryDbClient = db,
): Promise<ExclusionReviewBranchSyncResult> {
  const rootDriveId = getRootDriveId()
  const syncedDriveIds = new Set<string>()

  const syncFolderSubtree = async (folderDriveId: string): Promise<void> => {
    if (syncedDriveIds.has(folderDriveId)) {
      return
    }

    syncedDriveIds.add(folderDriveId)
    const syncedAt = new Date()
    await ensureDriveItemIndexed(rootDriveId, folderDriveId, client)

    await client.drive_exclusion_review_items.update({
      where: {
        root_drive_id_drive_id: {
          root_drive_id: rootDriveId,
          drive_id: folderDriveId,
        },
      },
      data: {
        subtree_index_status: 'syncing',
        last_sync_error: null,
        updated_at: syncedAt,
      },
    })

    let nextPageToken: string | null = null
    const seenChildDriveIds = new Set<string>()
    const directFolders: string[] = []

    /* eslint-disable no-await-in-loop */
    do {
      const page = await listExclusionReviewChildrenFromDrive(
        folderDriveId,
        nextPageToken ?? undefined,
      )
      for (const item of page.items) {
        seenChildDriveIds.add(item.driveId)
        syncedDriveIds.add(item.driveId)
        if (item.itemType === 'folder') {
          directFolders.push(item.driveId)
        }
      }

      await upsertDriveIndexItems(rootDriveId, page.items, client, {
        syncedAt,
      })
      nextPageToken = page.nextPageToken
    } while (nextPageToken)

    await reconcileMissingDirectChildren(
      rootDriveId,
      folderDriveId,
      seenChildDriveIds,
      client,
    )

    for (const childFolderDriveId of directFolders) {
      await syncFolderSubtree(childFolderDriveId)
    }
    /* eslint-enable no-await-in-loop */

    await client.drive_exclusion_review_items.update({
      where: {
        root_drive_id_drive_id: {
          root_drive_id: rootDriveId,
          drive_id: folderDriveId,
        },
      },
      data: {
        subtree_index_status: 'complete',
        last_synced_at: syncedAt,
        last_sync_error: null,
        updated_at: syncedAt,
      },
    })

    await recomputeBranchInheritedLineage(rootDriveId, folderDriveId, client)
  }

  await ensureRootIndexed(client)
  await syncFolderSubtree(driveId)
  const updatedRows = await getBranchRows(rootDriveId, driveId, client)

  return {
    driveId,
    syncedCount: syncedDriveIds.size,
    updatedNodes: updatedRows.map((row) => toTreeNode(row, updatedRows)),
    subtreeIndexStatus: 'complete',
  }
}
