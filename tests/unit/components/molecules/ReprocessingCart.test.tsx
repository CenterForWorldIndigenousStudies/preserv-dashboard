import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ReprocessingCart } from '@molecules/ReprocessingCart'

describe('ReprocessingCart', () => {
  it('keeps the draft count badge in the button layout flow', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ReprocessingCart
          drafts={[
            {
              id: 'draft-1',
              name: 'Draft batch',
              collectionName: null,
              collectionNotes: null,
              restartStage: 'ocr_processor',
              reason: 'Review correction',
              documentCount: 1,
              createdAt: null,
              updatedAt: null,
              createdBy: null,
              updatedBy: null,
            },
          ]}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Reprocessing cart')
    expect(markup).toContain('>1<')
    expect(markup).toMatch(/\.MuiBadge-badge\{[^}]*position:static/)
  })
})
