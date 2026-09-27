// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@mui/material/Dialog', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

import { CollectionDeleteDialog } from '@organisms/CollectionDeleteDialog'

describe('CollectionDeleteDialog', () => {
  it('shows shared qualifier blockers while allowing the collection deletion to continue', () => {
    const markup = renderToStaticMarkup(
      <CollectionDeleteDialog
        collection={{
          id: 'collection-1',
          tag_id: 'tag-canonical',
          collection_name: 'Archive',
          notes: null,
          created_at: null,
          updated_at: null,
          document_count: 3,
        }}
        open
        preview={{
          collectionId: 'collection-1',
          tagsToDelete: [
            { tagId: 'tag-canonical', tagName: 'Archive' },
            { tagId: 'tag-unique', tagName: 'Community History' },
          ],
          blockedTags: [
            {
              tagId: 'tag-shared',
              tagName: 'Indigenous Knowledge',
              collectionId: 'collection-2',
              collectionName: 'Research',
            },
          ],
        }}
        isLoadingPreview={false}
        onClose={vi.fn()}
        onConfirm={vi.fn(() => Promise.resolve())}
      />,
    )

    expect(markup).toContain('Also delete tag(s) and remove from all documents')
    expect(markup).toContain(
      'Tag &quot;Indigenous Knowledge&quot; cannot be deleted because it is associated with the Research collection.',
    )
    expect(markup).toContain('The collection will still be deleted.')
  })
})
