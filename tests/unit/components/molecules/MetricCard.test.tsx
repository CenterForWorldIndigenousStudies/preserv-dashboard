import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { MetricCard } from '@molecules/MetricCard'

describe('MetricCard', () => {
  it('renders the KPI label, formatted value, description, and link action', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MetricCard
          title="Needs Review"
          value={1200}
          description="Documents waiting in the current human review queue."
          href="/review-queue"
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Needs Review')
    expect(markup).toContain('1,200')
    expect(markup).toContain('Documents waiting in the current human review queue.')
    expect(markup).toContain('/review-queue')
    expect(markup).toContain('Open')
  })
})
