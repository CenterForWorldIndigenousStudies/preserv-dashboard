import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import {
  DocumentEditCoordinator,
  EDIT_TOGGLE_LABEL,
  EDIT_TOGGLE_TOOLTIP_DISCARD,
  EDIT_TOGGLE_TOOLTIP_DISABLE,
  EDIT_TOGGLE_TOOLTIP_ENABLE,
  getEditToggleTooltip,
} from '@organisms/DocumentEditCoordinator'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe('DocumentEditCoordinator', () => {
  it('describes what turning editing on will do', () => {
    expect(getEditToggleTooltip(false, false)).toBe(EDIT_TOGGLE_TOOLTIP_ENABLE)
  })

  it('describes the consequence of turning editing off with unsaved changes', () => {
    expect(getEditToggleTooltip(true, true)).toBe(EDIT_TOGGLE_TOOLTIP_DISCARD)
  })

  it('describes turning editing off when there are no unsaved changes', () => {
    expect(getEditToggleTooltip(true, false)).toBe(EDIT_TOGGLE_TOOLTIP_DISABLE)
  })

  it('starts in read-only mode and renders the existing detail content', () => {
    const markup = renderToStaticMarkup(
      <DocumentEditCoordinator
        documentId={'doc-1'}
        metadata={[]}
        quality={null}
        initialTags={[]}
        initialContributors={[]}
        initialPublishers={[]}
        initialAccessLevels={[]}
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
    expect(markup).toContain(EDIT_TOGGLE_TOOLTIP_ENABLE)
    expect(markup).toContain('position:sticky')
    expect(markup).toContain('max-width:fit-content')
    expect(markup).toContain('margin:0 auto')
    expect(markup).not.toContain('Save Changes')
  })
})
