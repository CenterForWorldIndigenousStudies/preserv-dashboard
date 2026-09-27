// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@mui/material/Dialog', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@molecules/TagSearchCombobox', () => ({
  TagSearchCombobox: ({ label }: { label: string }) => <div>{label}</div>,
}))

vi.mock('@actions/collections', () => ({
  createCollectionAction: vi.fn(() => Promise.resolve()),
  createCollectionWithNewTagAction: vi.fn(() => Promise.resolve()),
}))

import { AddCollectionDialog } from '@organisms/AddCollectionDialog'

describe('AddCollectionDialog', () => {
  it('offers a locked canonical qualifier, additional qualifiers, and a Library ID', () => {
    const markup = renderToStaticMarkup(<AddCollectionDialog open collections={[]} onClose={vi.fn()} />)

    expect(markup).toContain('Canonical qualifier (required)')
    expect(markup).toContain('Additional qualifiers')
    expect(markup).toContain('Library ID')
  })
})
