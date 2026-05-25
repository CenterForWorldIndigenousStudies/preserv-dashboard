import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AppVersion } from '@atoms/AppVersion'
import ThemeProvider from '@components/ThemeProvider'

describe('AppVersion', () => {
  it('renders the current dashboard app version', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <AppVersion />
      </ThemeProvider>,
    )

    expect(markup).toContain('Version: 0.1.0')
  })
})
