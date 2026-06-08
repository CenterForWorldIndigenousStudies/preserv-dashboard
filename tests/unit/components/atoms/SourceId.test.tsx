import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { SourceId } from '@atoms/SourceId'

describe('SourceId', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a dash when the value is nullish or empty', () => {
    expect(renderToStaticMarkup(<SourceId value={null} />)).toContain('>-<')
    expect(renderToStaticMarkup(<SourceId value="" />)).toContain('>-<')
    expect(renderToStaticMarkup(<SourceId value="   " />)).toContain('>-<')
  })

  it('renders a Google Drive link for likely drive file ids', () => {
    const markup = renderToStaticMarkup(<SourceId value="1poTSVemTJceJNCqWlhzNuUnrO4oX21Dy" />)

    expect(markup).toContain('href="https://drive.google.com/file/d/1poTSVemTJceJNCqWlhzNuUnrO4oX21Dy/view"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('1poTSVemTJceJNCqWlhzNuUnrO4oX21Dy')
  })

  it('renders plain text for values that do not look like Google Drive ids', () => {
    const markup = renderToStaticMarkup(<SourceId value="not-a-drive-id" />)

    expect(markup).not.toContain('href=')
    expect(markup).toContain('not-a-drive-id')
  })

  it('does not write render debug output to the browser console', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderToStaticMarkup(<SourceId value="1poTSVemTJceJNCqWlhzNuUnrO4oX21Dy" />)

    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
