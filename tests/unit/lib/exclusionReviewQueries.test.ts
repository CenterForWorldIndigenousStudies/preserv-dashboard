import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSearchExclusionReviewDriveByName,
  mockResolveExclusionReviewAncestorChain,
  mockListExclusionReviewChildrenFromDrive,
  mockGetExclusionReviewRootFromDrive,
} = vi.hoisted(() => ({
  mockSearchExclusionReviewDriveByName: vi.fn(),
  mockResolveExclusionReviewAncestorChain: vi.fn(),
  mockListExclusionReviewChildrenFromDrive: vi.fn(),
  mockGetExclusionReviewRootFromDrive: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {},
}))

vi.mock('@lib/exclusionReviewDrive', () => ({
  getExclusionReviewRootFromDrive: mockGetExclusionReviewRootFromDrive,
  listExclusionReviewChildrenFromDrive: mockListExclusionReviewChildrenFromDrive,
  resolveExclusionReviewAncestorChain: mockResolveExclusionReviewAncestorChain,
  searchExclusionReviewDriveByName: mockSearchExclusionReviewDriveByName,
}))

import {
  deriveEffectiveDecision,
  reconcileInheritedLineage,
} from '@lib/exclusionReviewQueries'

describe('deriveEffectiveDecision', () => {
  it('uses the inherited folder override while it is active', () => {
    expect(
      deriveEffectiveDecision({
        explicitDecision: 'include',
        effectiveAncestorDecision: 'exclude',
      }),
    ).toBe('exclude')
  })

  it('falls back to the explicit decision when no inherited override exists', () => {
    expect(
      deriveEffectiveDecision({
        explicitDecision: 'include',
        effectiveAncestorDecision: null,
      }),
    ).toBe('include')
  })
})

describe('reconcileInheritedLineage', () => {
  it('clears inherited lineage when a child moves outside the marked branch', () => {
    const updated = reconcileInheritedLineage({
      nextPath: ['root', 'folder-b'],
      previousEffectiveAncestorDecision: 'exclude',
      previousEffectiveAncestorDriveId: 'folder-a',
      previousEffectiveAncestorReviewedAt: new Date('2026-07-17T12:00:00.000Z'),
    })

    expect(updated.effectiveAncestorDriveId).toBeNull()
    expect(updated.effectiveAncestorDecision).toBeNull()
    expect(updated.effectiveAncestorReviewedAt).toBeNull()
  })

  it('preserves inherited lineage when the item remains under the same marked branch', () => {
    const reviewedAt = new Date('2026-07-17T12:00:00.000Z')

    const updated = reconcileInheritedLineage({
      nextPath: ['root', 'folder-a', 'folder-c'],
      previousEffectiveAncestorDecision: 'exclude',
      previousEffectiveAncestorDriveId: 'folder-a',
      previousEffectiveAncestorReviewedAt: reviewedAt,
    })

    expect(updated).toEqual({
      effectiveAncestorDriveId: 'folder-a',
      effectiveAncestorDecision: 'exclude',
      effectiveAncestorReviewedAt: reviewedAt,
    })
  })
})

describe('searchExclusionReviewTree', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID = 'root-folder'
  })

  afterEach(() => {
    delete process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID
  })

  it('returns already indexed matches before falling back to live Drive search', async () => {
    mockSearchExclusionReviewDriveByName.mockResolvedValue([])

    const indexedRoot = {
      drive_id: 'root-folder',
      root_drive_id: 'root-folder',
      parent_drive_id: null,
      item_type: 'folder',
      name: 'CWIS_CONTENT_ORIGINALS',
      mime_type: 'application/vnd.google-apps.folder',
      drive_url: 'https://drive.google.com/drive/folders/root-folder',
      path: '[]',
      depth: 0,
      explicit_review_decision: null,
      explicit_reviewed_by_email: null,
      explicit_reviewed_at: null,
      effective_ancestor_drive_id: null,
      effective_ancestor_decision: null,
      effective_ancestor_reviewed_at: null,
      subtree_index_status: 'pending',
      last_sync_error: null,
      last_synced_at: new Date('2026-07-20T10:00:00.000Z'),
      discovered_at: new Date('2026-07-20T10:00:00.000Z'),
      created_at: new Date('2026-07-20T10:00:00.000Z'),
      updated_at: new Date('2026-07-20T10:00:00.000Z'),
      id: 'row-root',
    }

    const indexedFolder = {
      ...indexedRoot,
      id: 'row-folder',
      drive_id: 'folder-1',
      parent_drive_id: 'root-folder',
      name: '108rcr W Proj.zip (Unzipped Files)',
      drive_url: 'https://drive.google.com/drive/folders/folder-1',
      path: '["root-folder"]',
      depth: 1,
    }

    const indexedFile = {
      ...indexedRoot,
      id: 'row-file',
      drive_id: 'file-1',
      parent_drive_id: 'folder-1',
      item_type: 'file',
      name: '100 Consent Abstract.doc',
      mime_type: 'application/msword',
      drive_url: 'https://drive.google.com/file/d/file-1/view',
      path: '["root-folder","folder-1"]',
      depth: 2,
      subtree_index_status: 'complete',
    }

    const findMany = vi.fn(
      (args?: {
        where?: {
          drive_id?: { in?: string[] }
          name?: { contains?: string }
        }
      }) => {
        const nameContains = args?.where?.name?.contains ?? null
        if (nameContains === '100 Consent Abstract.doc') {
          return [indexedFile]
        }

        const driveIds = args?.where?.drive_id?.in ?? null
        if (driveIds) {
          return [indexedRoot, indexedFolder, indexedFile].filter((record) =>
            driveIds.includes(record.drive_id),
          )
        }

        return []
      },
    )

    const client = {
      drive_exclusion_review_items: {
        findMany,
      },
    }

    const { searchExclusionReviewTree } = await import('@lib/exclusionReviewQueries')

    const result = await searchExclusionReviewTree(
      '100 Consent Abstract.doc',
      client as never,
    )

    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]?.driveId).toBe('file-1')
    expect(result.matches[0]?.name).toBe('100 Consent Abstract.doc')
    expect(result.ancestorDriveIdsToExpand).toEqual(['root-folder', 'folder-1'])
    expect(result.pathNodes.map((item) => item.driveId).sort()).toEqual([
      'file-1',
      'folder-1',
      'root-folder',
    ])
    expect(mockSearchExclusionReviewDriveByName).not.toHaveBeenCalled()
  })
})
