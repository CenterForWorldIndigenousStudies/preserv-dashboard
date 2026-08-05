import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetDashboardSession,
  mockGetExclusionReviewConfig,
  mockLoadExclusionReviewChildren,
  mockLoadExclusionReviewRootTree,
} = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockGetExclusionReviewConfig: vi.fn(),
  mockLoadExclusionReviewChildren: vi.fn(),
  mockLoadExclusionReviewRootTree: vi.fn(),
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

vi.mock('@lib/exclusionReviewConfig', () => ({
  getExclusionReviewConfig: mockGetExclusionReviewConfig,
}))

vi.mock('@lib/exclusionReviewQueries', () => ({
  loadExclusionReviewChildren: mockLoadExclusionReviewChildren,
  loadExclusionReviewRootTree: mockLoadExclusionReviewRootTree,
}))

import { GET as getTree } from '@api/exclusion-review/tree/route'
import { GET as getChildren } from '@api/exclusion-review/tree/children/route'

describe('exclusion review tree routes', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns the root tree payload and editor state for allowlisted users', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'editor@example.org' },
    })
    mockGetExclusionReviewConfig.mockReturnValue({
      rootFolderId: 'root-folder',
      allowedEditorEmails: ['editor@example.org'],
      childPageSize: 200,
    })
    mockLoadExclusionReviewRootTree.mockResolvedValue({
      root: {
        driveId: 'root-folder',
        parentDriveId: null,
        itemType: 'folder',
        name: 'Root Folder',
        mimeType: 'application/vnd.google-apps.folder',
        driveUrl: 'https://drive.google.com/drive/folders/root-folder',
        path: [],
        depth: 0,
        explicitDecision: null,
        effectiveDecision: null,
        effectiveAncestorDriveId: null,
        effectiveAncestorDecision: null,
        subtreeIndexStatus: 'pending',
        aggregateFolderStatus: null,
        isInheritedLocked: false,
        hasChildren: true,
      },
      rootChildren: {
        parentDriveId: 'root-folder',
        items: [],
        nextPageToken: null,
        hasMore: false,
        branchSyncStatus: 'pending',
      },
    })

    const response = await getTree(new NextRequest('http://localhost/api/exclusion-review/tree'))
    const payload = (await response.json()) as {
      isEditor?: boolean
      tree?: { root: { driveId: string } }
    }

    expect(response.status).toBe(200)
    expect(payload.isEditor).toBe(true)
    expect(payload.tree?.root.driveId).toBe('root-folder')
  })

  it('returns a setup error when the exclusion review table is missing', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'editor@example.org' },
    })
    mockGetExclusionReviewConfig.mockReturnValue({
      rootFolderId: 'root-folder',
      allowedEditorEmails: ['editor@example.org'],
      childPageSize: 200,
    })
    mockLoadExclusionReviewRootTree.mockRejectedValue({
      code: 'P2021',
      meta: {
        modelName: 'drive_exclusion_review_items',
      },
    })

    const response = await getTree(new NextRequest('http://localhost/api/exclusion-review/tree'))
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(503)
    expect(payload.error).toBe(
      'Exclusion review setup is incomplete in this environment. Run the dashboard database migrations and reload this page.',
    )
  })

  it('returns a setup error when the root folder is not configured', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'editor@example.org' },
    })
    mockGetExclusionReviewConfig.mockImplementation(() => {
      const error = new Error('EXCLUSION_REVIEW_ROOT_FOLDER_ID is required for the Exclusion Review workspace.')
      Object.assign(error, {
        code: 'EXCLUSION_REVIEW_CONFIGURATION_ERROR',
      })
      throw error
    })

    const response = await getTree(new NextRequest('http://localhost/api/exclusion-review/tree'))
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(503)
    expect(payload.error).toBe('EXCLUSION_REVIEW_ROOT_FOLDER_ID is required for the Exclusion Review workspace.')
  })

  it('returns a branch page for the requested parent', async () => {
    mockGetDashboardSession.mockResolvedValue({
      user: { email: 'viewer@example.org' },
    })
    mockLoadExclusionReviewChildren.mockResolvedValue({
      parentDriveId: 'folder-1',
      items: [],
      nextPageToken: 'page-2',
      hasMore: true,
      branchSyncStatus: 'pending',
    })

    const response = await getChildren(
      new NextRequest('http://localhost/api/exclusion-review/tree/children?parentId=folder-1&pageToken=page-1'),
    )
    const payload = (await response.json()) as {
      page?: { parentDriveId: string; hasMore: boolean }
    }

    expect(response.status).toBe(200)
    expect(payload.page).toEqual({
      parentDriveId: 'folder-1',
      items: [],
      nextPageToken: 'page-2',
      hasMore: true,
      branchSyncStatus: 'pending',
    })
    expect(mockLoadExclusionReviewChildren).toHaveBeenCalledWith('folder-1', 'page-1')
  })
})
