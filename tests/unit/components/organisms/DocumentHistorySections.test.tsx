import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@organisms/AuditHistoryTable', () => ({
  AuditHistoryTable: () => <div>{'Audit history table'}</div>,
}))

vi.mock('@organisms/StateHistoryTable', () => ({
  StateHistoryTable: () => <div>{'State history table'}</div>,
}))

import { DocumentHistorySections } from '@organisms/DocumentHistorySections'

describe('DocumentHistorySections', () => {
  it('renders audit and state history in the shared history layout', () => {
    const markup = renderToStaticMarkup(
      <DocumentHistorySections audits={[]} states={[]} documentId={'document-1'} needsReviewReasons={[]} />,
    )

    expect(markup).toContain('Audit History')
    expect(markup).toContain('State History')
    expect(markup).toContain('Audit history table')
    expect(markup).toContain('State history table')
    expect(markup.indexOf('State History')).toBeLessThan(markup.indexOf('Audit History'))
  })
})
