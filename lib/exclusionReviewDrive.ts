import { getExclusionReviewConfig } from '@lib/exclusionReviewConfig'
import {
  fetchDriveJson,
  GOOGLE_FOLDER_MIME,
  type DriveFileResponse,
} from '@lib/googleDrive'
import type { DriveIndexItem } from 'types/exclusionReview'

interface DriveListResponse {
  files?: DriveFileResponse[]
  nextPageToken?: string | null
}

function toDriveUrl(
  itemType: DriveIndexItem['itemType'],
  driveId: string,
): string {
  return itemType === 'folder'
    ? `https://drive.google.com/drive/folders/${driveId}`
    : `https://drive.google.com/file/d/${driveId}/view`
}

function toDriveIndexItem(
  file: DriveFileResponse,
  parentDriveId: string | null,
  path: string[],
): DriveIndexItem {
  if (!file.id) {
    throw new Error('Drive response is missing file id')
  }

  const itemType = file.mimeType === GOOGLE_FOLDER_MIME ? 'folder' : 'file'

  return {
    driveId: file.id,
    parentDriveId,
    itemType,
    name: file.name?.trim() || 'Untitled',
    mimeType: file.mimeType ?? null,
    driveUrl: toDriveUrl(itemType, file.id),
    path,
    depth: path.length,
  }
}

function compareDriveIndexItems(left: DriveIndexItem, right: DriveIndexItem): number {
  if (left.itemType !== right.itemType) {
    return left.itemType === 'folder' ? -1 : 1
  }

  return left.name.localeCompare(right.name)
}

async function getDriveFile(driveId: string): Promise<DriveFileResponse> {
  return fetchDriveJson<DriveFileResponse>(`/files/${driveId}`, {
    fields: 'id,name,mimeType,parents',
    supportsAllDrives: 'true',
  })
}

async function resolveDriveFilesFromRoot(
  driveId: string,
  rootFolderId: string,
  visitedDriveIds: Set<string>,
): Promise<DriveFileResponse[] | null> {
  if (visitedDriveIds.has(driveId)) {
    return null
  }

  const currentFile = await getDriveFile(driveId)
  if (!currentFile.id) {
    throw new Error(`Drive item ${driveId} is missing an id`)
  }

  if (currentFile.id === rootFolderId) {
    return [currentFile]
  }

  const parentDriveIds = (currentFile.parents ?? []).map((value) => value?.trim()).filter(Boolean)
  if (parentDriveIds.length === 0) {
    return null
  }

  const nextVisitedDriveIds = new Set(visitedDriveIds)
  nextVisitedDriveIds.add(currentFile.id)

  /* eslint-disable no-await-in-loop */
  for (const parentDriveId of parentDriveIds) {
    const parentChain = await resolveDriveFilesFromRoot(
      parentDriveId,
      rootFolderId,
      nextVisitedDriveIds,
    )
    if (parentChain) {
      return [...parentChain, currentFile]
    }
  }
  /* eslint-enable no-await-in-loop */

  return null
}

export async function resolveExclusionReviewAncestorChain(
  driveId: string,
): Promise<DriveIndexItem[]> {
  const { rootFolderId } = getExclusionReviewConfig()
  const filesFromRootToTarget = await resolveDriveFilesFromRoot(
    driveId,
    rootFolderId,
    new Set<string>(),
  )

  if (!filesFromRootToTarget) {
    throw new Error(`Drive item ${driveId} is not under configured root ${rootFolderId}`)
  }

  const ancestorIds: string[] = []

  return filesFromRootToTarget.map((file, index) => {
    const parentDriveId =
      index === 0 ? null : (filesFromRootToTarget[index - 1]?.id ?? null)
    const item = toDriveIndexItem(file, parentDriveId, [...ancestorIds])

    if (index < filesFromRootToTarget.length - 1 && file.id) {
      ancestorIds.push(file.id)
    }

    return item
  })
}

export async function getExclusionReviewRootFromDrive(): Promise<DriveIndexItem> {
  const { rootFolderId } = getExclusionReviewConfig()
  const rootFile = await getDriveFile(rootFolderId)

  return toDriveIndexItem(rootFile, null, [])
}

export async function listExclusionReviewChildrenFromDrive(
  parentDriveId: string,
  pageToken?: string,
  parentPath?: string[],
): Promise<{ items: DriveIndexItem[]; nextPageToken: string | null }> {
  const { childPageSize } = getExclusionReviewConfig()
  const path =
    parentPath && parentPath.length > 0
      ? [...parentPath]
      : (await resolveExclusionReviewAncestorChain(parentDriveId)).map(
          (item) => item.driveId,
        )

  const payload = await fetchDriveJson<DriveListResponse>('/files', {
    q: `'${parentDriveId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,parents),nextPageToken',
    pageSize: String(childPageSize),
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    ...(pageToken ? { pageToken } : {}),
  })

  const items = (payload.files ?? [])
    .map((file) => toDriveIndexItem(file, parentDriveId, path))
    .sort(compareDriveIndexItems)

  return {
    items,
    nextPageToken: payload.nextPageToken ?? null,
  }
}

function escapeDriveNameQueryTerm(value: string): string {
  return value.replace(/'/g, "\\'")
}

function tokenizeDriveNameSearchQuery(query: string): string[] {
  const tokens = query.match(/[\p{L}\p{N}]+/gu) ?? []
  return [...new Set(tokens.map((token) => token.trim()).filter(Boolean))]
}

function buildDriveNameSearchQuery(terms: string[]): string {
  return `${terms
    .map((term) => `name contains '${escapeDriveNameQueryTerm(term)}'`)
    .join(' and ')} and trashed = false`
}

async function resolveSearchMatchesFromDriveFiles(
  files: DriveFileResponse[],
): Promise<DriveIndexItem[]> {
  const resolvedItems: Array<DriveIndexItem | null> = []

  /* eslint-disable no-await-in-loop */
  for (const file of files) {
    if (!file.id) {
      resolvedItems.push(null)
      continue
    }

    try {
      const chain = await resolveExclusionReviewAncestorChain(file.id)
      resolvedItems.push(chain.at(-1) ?? null)
    } catch {
      resolvedItems.push(null)
    }
  }
  /* eslint-enable no-await-in-loop */

  return resolvedItems
    .filter((item): item is DriveIndexItem => item !== null)
    .sort(compareDriveIndexItems)
}

export async function searchExclusionReviewDriveByName(
  query: string,
): Promise<DriveIndexItem[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return []
  }

  const payload = await fetchDriveJson<DriveListResponse>('/files', {
    q: buildDriveNameSearchQuery([trimmedQuery]),
    fields: 'files(id,name,mimeType,parents)',
    pageSize: '200',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })

  const exactMatches = await resolveSearchMatchesFromDriveFiles(payload.files ?? [])
  if (exactMatches.length > 0) {
    return exactMatches
  }

  const fallbackTerms = tokenizeDriveNameSearchQuery(trimmedQuery)
  if (fallbackTerms.length <= 1) {
    return exactMatches
  }

  const fallbackPayload = await fetchDriveJson<DriveListResponse>('/files', {
    q: buildDriveNameSearchQuery(fallbackTerms),
    fields: 'files(id,name,mimeType,parents)',
    pageSize: '200',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })

  return resolveSearchMatchesFromDriveFiles(fallbackPayload.files ?? [])
}
