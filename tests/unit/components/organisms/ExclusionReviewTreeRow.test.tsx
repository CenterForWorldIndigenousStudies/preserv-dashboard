import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ExclusionReviewTreeRow } from '@organisms/ExclusionReviewTreeRow'

describe('ExclusionReviewTreeRow', () => {
  it('keeps the action rail visible for long names and shows inherited lock state', () => {
    const markup = renderToStaticMarkup(
      <ExclusionReviewTreeRow
        depth={1}
        isEditor={true}
        node={{
          driveId: 'file-1',
          parentDriveId: 'folder-1',
          name: 'A very long file name that should truncate before it pushes the action rail away from the right edge.pdf',
          itemType: 'file',
          mimeType: 'application/pdf',
          driveUrl: 'https://drive.google.com/file/d/file-1/view',
          path: ['root-folder', 'folder-1'],
          depth: 2,
          explicitDecision: null,
          effectiveDecision: 'exclude',
          effectiveAncestorDriveId: 'folder-1',
          effectiveAncestorDecision: 'exclude',
          subtreeIndexStatus: 'complete',
          aggregateFolderStatus: null,
          isInheritedLocked: true,
          hasChildren: false,
        }}
        onDecisionChange={() => {}}
        onSyncBranch={() => {}}
      />,
    )

    expect(markup).toContain('Open in Drive')
    expect(markup).toContain('aria-label="Inline actions"')
    expect(markup).not.toContain('aria-label="Utility actions"')
    expect(markup).toContain('aria-disabled="true"')
    expect(markup).toContain(
      'A very long file name that should truncate before it pushes the action rail away from the right edge.pdf',
    )
  })
})
