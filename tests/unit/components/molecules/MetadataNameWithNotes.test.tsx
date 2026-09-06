import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { MetadataNameWithNotes } from '@molecules/MetadataNameWithNotes'

describe('MetadataNameWithNotes', () => {
  it('shows metadata notes in an accessible tooltip', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MetadataNameWithNotes name={'title'} notes={'The document title from the source record.'} />
      </ThemeProvider>,
    )

    expect(markup).toContain('title: The document title from the source record.')
  })

  it('renders metadata without a tooltip when notes are unavailable', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MetadataNameWithNotes name={'title'} notes={null} />
      </ThemeProvider>,
    )

    expect(markup).toContain('>title</span>')
    expect(markup).not.toContain('aria-label')
  })
})
