import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { PipelineStepSelector } from '@molecules/PipelineStepSelector'
import { createDefaultDraft } from '@lib/pipelineConfig'

describe('PipelineStepSelector', () => {
  it('does not expose the downstream Fedora translator as a process step', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <PipelineStepSelector draft={createDefaultDraft()} mode="custom" onDraftChange={vi.fn()} />
      </ThemeProvider>,
    )

    expect(markup).not.toContain('Fedora Ingester')
  })

  it('shows the OpenAI batch helper copy only when metadata extraction is enabled', () => {
    const disabledDraft = createDefaultDraft()
    const disabledMarkup = renderToStaticMarkup(
      <ThemeProvider>
        <PipelineStepSelector draft={disabledDraft} mode="custom" onDraftChange={vi.fn()} />
      </ThemeProvider>,
    )

    expect(disabledMarkup).not.toContain('Use OpenAI Batch Service for metadata extraction')

    const enabledDraft = createDefaultDraft()
    enabledDraft.steps.metadataExtraction = true
    const enabledMarkup = renderToStaticMarkup(
      <ThemeProvider>
        <PipelineStepSelector draft={enabledDraft} mode="custom" onDraftChange={vi.fn()} />
      </ThemeProvider>,
    )

    expect(enabledMarkup).toContain('Use OpenAI Batch Service for metadata extraction')
    expect(enabledMarkup).toContain('This is separate from the dashboard processing batch.')
  })
})
