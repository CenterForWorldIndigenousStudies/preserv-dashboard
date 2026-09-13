import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@mui/material/Dialog', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@mui/material/DialogTitle', () => ({
  default: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))
vi.mock('@mui/material/DialogContent', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@mui/material/DialogActions', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { DocumentEditAccessDialog } from '@molecules/DocumentEditAccessDialog'

describe('DocumentEditAccessDialog', () => {
  it('shows the approved warning and disables Yes until a reason is provided', () => {
    const markup = renderToStaticMarkup(
      <DocumentEditAccessDialog
        open
        warning={'approved'}
        reason={''}
        onReasonChange={() => undefined}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    )

    expect(markup).toContain(
      'This document has already been approved. If you make any edits to the document, it will go back to the &#x27;Review Queue&#x27; and will need explicit approval. Are you sure you want to do this?',
    )
    expect(markup).toContain('>Reason')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('shows the published warning and enables Yes with a reason', () => {
    const markup = renderToStaticMarkup(
      <DocumentEditAccessDialog
        open
        warning={'published'}
        reason={'Correct the published title.'}
        onReasonChange={vi.fn()}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    )

    expect(markup).toContain('This document has already been published.')
    expect(markup).not.toMatch(/<button[^>]*disabled/)
  })
})
