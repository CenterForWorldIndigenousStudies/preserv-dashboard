import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { RemoveTagDialog } from '@organisms/RemoveTagDialog'

type RemoveTagDialogElement = ReactElement<{
  checkboxLabel?: string
}>

describe('RemoveTagDialog', () => {
  it('does not pass system delete controls for protected tags', () => {
    const element = RemoveTagDialog({
      open: true,
      tagName: 'duplicate_document',
      usageCount: 3,
      onClose: vi.fn(),
      onConfirm: vi.fn(() => Promise.resolve()),
    }) as RemoveTagDialogElement

    expect(element.props.checkboxLabel).toBeUndefined()
  })

  it('passes system delete controls for non-protected tags', () => {
    const element = RemoveTagDialog({
      open: true,
      tagName: 'custom-tag',
      usageCount: 3,
      onClose: vi.fn(),
      onConfirm: vi.fn(() => Promise.resolve()),
    }) as RemoveTagDialogElement

    expect(element.props.checkboxLabel).toBe('Also delete tag and remove from all documents')
  })
})
