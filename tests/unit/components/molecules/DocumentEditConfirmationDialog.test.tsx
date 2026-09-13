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

import { DocumentEditConfirmationDialog } from '@molecules/DocumentEditConfirmationDialog'

describe('DocumentEditConfirmationDialog', () => {
  it('summarizes the actual before and after values for save confirmation', () => {
    const markup = renderToStaticMarkup(
      <DocumentEditConfirmationDialog
        open
        mode={'save'}
        changes={[{ fieldName: 'dc_title', previousValue: 'Before', newValue: 'After', summary: 'Changed title.' }]}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    )

    expect(markup).toContain('dc_title')
    expect(markup).toContain('Before')
    expect(markup).toContain('After')
  })

  it('shows a save validation error without hiding the draft', () => {
    const markup = renderToStaticMarkup(
      <DocumentEditConfirmationDialog
        open
        mode={'save'}
        changes={[{ fieldName: 'dc_title', previousValue: 'Before', newValue: 'After', summary: 'Changed title.' }]}
        error={'The selected contributor role is required.'}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    )

    expect(markup).toContain('The selected contributor role is required.')
    expect(markup).toContain('Keep Editing')
  })
})
