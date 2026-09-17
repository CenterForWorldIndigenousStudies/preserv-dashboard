import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DocumentEditCoordinator, EDIT_TOGGLE_LABEL } from '@organisms/DocumentEditCoordinator'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe('DocumentEditCoordinator', () => {
  it('starts in read-only mode and renders the existing detail content', () => {
    const markup = renderToStaticMarkup(
      <DocumentEditCoordinator
        documentId={'doc-1'}
        metadata={[]}
        quality={null}
        initialTags={[]}
        initialContributors={[]}
        initialPublishers={[]}
        toolbarContent={<span>Review toolbar</span>}
      >
        <div>Read-only document details</div>
      </DocumentEditCoordinator>,
    )

    expect(markup).toContain('Read-only document details')
    expect(markup).toContain(EDIT_TOGGLE_LABEL)
    expect(markup).toContain('Review toolbar')
    expect(markup.indexOf('Review toolbar')).toBeLessThan(markup.indexOf(EDIT_TOGGLE_LABEL))
    expect(markup).toContain('type="checkbox"')
    expect(markup).toContain('position:sticky')
    expect(markup).toContain('max-width:fit-content')
    expect(markup).toContain('margin:0 auto')
    expect(markup).not.toContain('Save Changes')
  })
})
