import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ActionCard, DEFAULT_ACTION_CARD_LABEL } from '@molecules/ActionCard'
import { REVIEW_QUEUE_PATH } from '@constants/paths'

describe('ActionCard', () => {
  it('renders the eyebrow, title, description, link, and standardized open action', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ActionCard
          description="Go to the current review workflow."
          eyebrow="Quick Action"
          href={REVIEW_QUEUE_PATH}
          title="Review Queue"
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Quick Action')
    expect(markup).toContain('Review Queue')
    expect(markup).toContain('Go to the current review workflow.')
    expect(markup).toContain(REVIEW_QUEUE_PATH)
    expect(markup).toContain(DEFAULT_ACTION_CARD_LABEL)
  })
})
