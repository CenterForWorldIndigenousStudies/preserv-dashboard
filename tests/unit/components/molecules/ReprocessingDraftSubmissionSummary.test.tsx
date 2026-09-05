import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ReprocessingDraftSubmissionSummary } from '@molecules/ReprocessingDraftSubmissionSummary'

describe('ReprocessingDraftSubmissionSummary', () => {
  it('summarizes the fixed start stage and downstream execution plan', () => {
    const markup = renderToStaticMarkup(
      <ReprocessingDraftSubmissionSummary
        documentCount={3}
        restartStage={'metadata_extractor'}
        collectionName={'Review collection'}
        reason={'Correct extracted metadata'}
      />,
    )

    expect(markup).toContain('Submission summary')
    expect(markup).toContain('3 documents')
    expect(markup).toContain('Starts at:')
    expect(markup).toContain('Then runs:')
    expect(markup).toContain('Metadata Extractor')
    expect(markup).toContain('Metadata Validator')
    expect(markup).toContain('Rights Determinator')
    expect(markup).toContain('Fedora Ingester')
    expect(markup).toContain('Review collection')
    expect(markup).toContain('Correct extracted metadata')
  })

  it('does not render an empty collection value', () => {
    const markup = renderToStaticMarkup(
      <ReprocessingDraftSubmissionSummary
        documentCount={0}
        restartStage={'rights_determinator'}
        collectionName={null}
        reason={'Retry rights determination'}
      />,
    )

    expect(markup).toContain('0 documents')
    expect(markup).not.toContain('Collection')
  })
})
