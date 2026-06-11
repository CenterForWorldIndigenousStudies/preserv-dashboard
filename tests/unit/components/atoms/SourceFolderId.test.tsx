import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { SourceFolderId } from '@atoms/SourceFolderId'

describe('SourceFolderId', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a dash when the value is nullish or empty', () => {
    expect(renderToStaticMarkup(<SourceFolderId value={null} />)).toContain('>-<')
    expect(renderToStaticMarkup(<SourceFolderId value="" />)).toContain('>-<')
    expect(renderToStaticMarkup(<SourceFolderId value="   " />)).toContain('>-<')
  })

  it('renders a Google Drive folder link for likely drive folder ids', () => {
    const markup = renderToStaticMarkup(<SourceFolderId value="1ZdR3L5sY2q8uVf9X0aB6cDEfGhIjKlmN" />)

    expect(markup).toContain('href="https://drive.google.com/drive/folders/1ZdR3L5sY2q8uVf9X0aB6cDEfGhIjKlmN"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('1ZdR3L5sY2q8uVf9X0aB6cDEfGhIjKlmN')
  })

  it('renders plain text for values that do not look like Google Drive ids', () => {
    const markup = renderToStaticMarkup(<SourceFolderId value="not-a-drive-id" />)

    expect(markup).not.toContain('href=')
    expect(markup).toContain('not-a-drive-id')
  })

  it('does not write render debug output to the browser console', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderToStaticMarkup(<SourceFolderId value="1ZdR3L5sY2q8uVf9X0aB6cDEfGhIjKlmN" />)

    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
