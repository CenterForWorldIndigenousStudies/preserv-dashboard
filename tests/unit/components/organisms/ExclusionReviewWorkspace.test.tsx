import fs from 'node:fs'
import path from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  ExclusionReviewWorkspace,
  mergeSearchPathNodes,
  SearchStatusAdornment,
} from '@organisms/ExclusionReviewWorkspace'

describe('ExclusionReviewWorkspace', () => {
  it('does not make the search effect depend on branch state updates', () => {
    const source = fs.readFileSync(
      path.resolve(
        process.cwd(),
        'components/organisms/ExclusionReviewWorkspace.tsx',
      ),
      'utf8',
    )

    expect(source).not.toContain('}, [branches, deferredSearchValue])')
    expect(source).toContain('}, [deferredSearchValue])')
  })

  it('renders the search control and load more affordance for paged branches', () => {
    const markup = renderToStaticMarkup(
      <ExclusionReviewWorkspace
        initialTree={{
          root: {
            driveId: 'root-folder',
            parentDriveId: null,
            itemType: 'folder',
            name: 'Configured Root',
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
            items: [
              {
                driveId: 'annual-report',
                parentDriveId: 'root-folder',
                itemType: 'file',
                name: 'annual-report.pdf',
                mimeType: 'application/pdf',
                driveUrl: 'https://drive.google.com/file/d/annual-report/view',
                path: ['root-folder'],
                depth: 1,
                explicitDecision: null,
                effectiveDecision: null,
                effectiveAncestorDriveId: null,
                effectiveAncestorDecision: null,
                subtreeIndexStatus: 'complete',
                aggregateFolderStatus: null,
                isInheritedLocked: false,
                hasChildren: false,
              },
            ],
            nextPageToken: 'page-2',
            hasMore: true,
            branchSyncStatus: 'pending',
          },
        }}
        isEditor={true}
      />,
    )

    expect(markup).toContain('Search this configured root')
    expect(markup).toContain('annual-report.pdf')
    expect(markup).toContain('Load more')
  })

  it('renders a spinner in the search field while search is in flight', () => {
    const markup = renderToStaticMarkup(<SearchStatusAdornment isSearching={true} />)

    expect(markup).toContain('Searching exclusion review')
    expect(markup).toContain('progressbar')
  })

  it('stitches search path nodes into parent branches that were not previously loaded', () => {
    const rootNode = {
      driveId: 'root-folder',
      parentDriveId: null,
      itemType: 'folder' as const,
      name: 'Configured Root',
      mimeType: 'application/vnd.google-apps.folder',
      driveUrl: 'https://drive.google.com/drive/folders/root-folder',
      path: [],
      depth: 0,
      explicitDecision: null,
      effectiveDecision: null,
      effectiveAncestorDriveId: null,
      effectiveAncestorDecision: null,
      subtreeIndexStatus: 'pending' as const,
      aggregateFolderStatus: null,
      isInheritedLocked: false,
      hasChildren: true,
    }

    const folderNode = {
      ...rootNode,
      driveId: 'folder-a',
      parentDriveId: 'root-folder',
      name: 'Folder A',
      path: ['root-folder'],
      depth: 1,
    }

    const fileNode = {
      ...rootNode,
      driveId: 'file-z',
      parentDriveId: 'folder-a',
      itemType: 'file' as const,
      name: '100 Consent of Nations.doc',
      mimeType: 'application/msword',
      driveUrl: 'https://drive.google.com/file/d/file-z/view',
      path: ['root-folder', 'folder-a'],
      depth: 2,
      hasChildren: false,
    }

    const merged = mergeSearchPathNodes(
      { [rootNode.driveId]: rootNode },
      {
        [rootNode.driveId]: {
          childIds: [],
          hasMore: true,
          loaded: true,
          loading: false,
          nextPageToken: 'page-2',
        },
      },
      [folderNode, fileNode],
    )

    expect(merged.nodes['folder-a']?.name).toBe('Folder A')
    expect(merged.nodes['file-z']?.name).toBe('100 Consent of Nations.doc')
    expect(merged.branches['root-folder']).toEqual({
      childIds: ['folder-a'],
      hasMore: true,
      loaded: true,
      loading: false,
      nextPageToken: 'page-2',
    })
    expect(merged.branches['folder-a']).toEqual({
      childIds: ['file-z'],
      hasMore: false,
      loaded: false,
      loading: false,
      nextPageToken: null,
    })
  })
})
