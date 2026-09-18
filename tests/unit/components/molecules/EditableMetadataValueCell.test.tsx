// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EditableMetadataValueCell } from '@molecules/EditableMetadataValueCell'
import { DocumentEditContext, type DocumentEditContextValue } from '@lib/hooks/useDocumentEditContext'
import { normalizeAccessLevel } from '@lib/search'
import type { MetadataField } from 'types/metadata'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('EditableMetadataValueCell', () => {
  let root: Root | undefined

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    document.body.replaceChildren()
  })

  function renderCell(
    field: MetadataField,
    value: string,
    onUpdateMetadata = vi.fn(),
    onUpdateQuality = vi.fn(),
    quality: DocumentEditContextValue['draft']['quality'] = { comment: null, commentAdditional: null },
  ): HTMLDivElement {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const contextValue: DocumentEditContextValue = {
      isEditing: true,
      draft: {
        accessLevel: field.name === 'access_level' ? normalizeAccessLevel(value) ?? null : null,
        metadata: { [field.name]: value },
        quality,
        tags: [],
        contributors: [],
        publishers: [],
      },
      updateAccessLevel: vi.fn(),
      updateMetadata: onUpdateMetadata,
      updateQuality: onUpdateQuality,
      updateTags: vi.fn(),
      deleteTag: vi.fn(),
      updateContributors: vi.fn(),
      updatePublishers: vi.fn(),
    }

    act(() => {
      root?.render(
        <DocumentEditContext.Provider value={contextValue}>
          <EditableMetadataValueCell field={field} editable>
            {'Read-only value'}
          </EditableMetadataValueCell>
        </DocumentEditContext.Provider>,
      )
    })

    return container
  }

  it('uses a multiline text field only when a string is longer than 70 characters', () => {
    const field: MetadataField = { name: 'dc_description', value: '', value_type: 'string', notes: null }

    const shortContainer = renderCell(field, 'x'.repeat(70))
    expect(shortContainer.querySelector('textarea')).toBeNull()
    expect(shortContainer.querySelector('input')).not.toBeNull()

    act(() => root?.unmount())
    root = undefined
    document.body.replaceChildren()

    const longContainer = renderCell(field, 'x'.repeat(71))
    expect(longContainer.querySelector('textarea')).not.toBeNull()
    expect(longContainer.querySelector('input')).toBeNull()
  })

  it('preserves spaces and carriage returns while editing text', () => {
    const onUpdateMetadata = vi.fn()
    const container = renderCell(
      { name: 'dc_description', value: '', value_type: 'string', notes: null },
      'x'.repeat(71),
      onUpdateMetadata,
    )
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const nextValue = 'A long description with a trailing space and\na second line '

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      valueSetter?.call(textarea, nextValue)
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(onUpdateMetadata).toHaveBeenCalledWith('dc_description', nextValue)
  })

  it('converts a selected date to a Unix timestamp before updating metadata', () => {
    const onUpdateMetadata = vi.fn()
    const container = renderCell(
      { name: 'dc_date', value: '{"value":"2026-09-11"}', value_type: 'date', notes: null },
      '2026-09-11',
      onUpdateMetadata,
    )
    const input = container.querySelector('input[type="date"]') as HTMLInputElement

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, '2026-09-12')
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(onUpdateMetadata).toHaveBeenCalledWith('dc_date', 1789171200)
  })

  it('uses a text field when sensitive metadata is stored as a string', () => {
    const container = renderCell(
      { name: 'sensitive', value: '{"value":"true"}', value_type: 'string', notes: null },
      'true',
    )

    expect(container.querySelector('input[type="checkbox"]')).toBeNull()
    expect(container.querySelector('input[type="text"]')).not.toBeNull()
  })

  it('uses a seeded access-level selector for the access-level field', () => {
    const container = renderCell(
      { name: 'access_level', value: JSON.stringify({ value: 'restricted' }), value_type: 'access_level', notes: null },
      'restricted',
    )

    expect(container.querySelector('[role="combobox"]')).not.toBeNull()
    expect(container.textContent).toContain('Restricted access')
  })

  it('updates metadata-backed comment fields while editing', () => {
    const onUpdateMetadata = vi.fn()
    const container = renderCell(
      { name: 'comments_general', value: '', value_type: 'string', notes: null },
      'Existing general comment',
      onUpdateMetadata,
    )
    const input = container.querySelector('input') as HTMLInputElement

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, 'Updated general comment')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(onUpdateMetadata).toHaveBeenCalledWith('comments_general', 'Updated general comment')
  })

  it('updates quality-backed comment fields while editing', () => {
    const onUpdateQuality = vi.fn()
    const container = renderCell(
      { name: 'comment', value: '', value_type: 'string', notes: null },
      'Existing comment',
      vi.fn(),
      onUpdateQuality,
      { comment: 'Existing comment', commentAdditional: null },
    )
    const input = container.querySelector('input') as HTMLInputElement

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, 'Updated comment')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(onUpdateQuality).toHaveBeenCalledWith('comment', 'Updated comment')
  })
})
